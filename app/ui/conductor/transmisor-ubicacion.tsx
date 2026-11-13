"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Posicion } from "@/app/lib/acciones-seguimiento";
import { INTERVALO_UBICACION_MS, lecturaGpsReciente, tocaEnviar } from "@/app/lib/seguimiento";

// Mientras el viaje o el cupo está activo, manda la ubicación del conductor
// cada 5 segundos (013 y 014) para que los estudiantes lo vean moverse en el
// mapa. Recibe la acción ya atada a su viaje o cupo (reportarUbicacion.bind). Pide que la
// pantalla no se apague, porque con la pantalla apagada el navegador deja de
// dar la ubicación.

type Estado = { paso: "buscando" } | { paso: "en-vivo" } | { paso: "error"; mensaje: string };

const sinSuscripcion = () => () => {};

function mensajeDeFallo(codigo: number): string {
  if (codigo === 1) return "El navegador no deja leer tu ubicación. Dale permiso para que el estudiante te vea llegar.";
  if (codigo === 3) return "Tu ubicación está tardando. Revisa que el GPS esté encendido.";
  return "Tu teléfono no pudo calcular dónde estás. Revisa que el GPS esté encendido.";
}

export function TransmisorUbicacion({
  enviar: enviarAlServidor,
  clave,
  quienVe = "El estudiante",
}: {
  enviar: (posicion: Posicion) => Promise<{ ok: boolean; mensaje?: string }>;
  /** Id del viaje o del cupo: si cambia, se vuelve a empezar. */
  clave: string;
  quienVe?: string;
}) {
  const enviarRef = useRef(enviarAlServidor);
  useEffect(() => {
    enviarRef.current = enviarAlServidor;
  });
  // Saber si hay GPS sin romper la hidratación (en el servidor se supone que sí).
  const conGps = useSyncExternalStore(
    sinSuscripcion,
    () => "geolocation" in navigator,
    () => true,
  );
  const [estado, setEstado] = useState<Estado>({ paso: "buscando" });

  useEffect(() => {
    if (!conGps) return;
    let vigente = true;
    let ultimaPosicion: GeolocationPosition | null = null;
    let ultimoEnvio: number | null = null;
    let ultimaMedicionEnviada: number | null = null;
    let enviando = false;
    let consultando = false;

    async function enviar() {
      const posicion = ultimaPosicion;
      const ahora = Date.now();
      if (!vigente || !posicion || enviando || !tocaEnviar(ultimoEnvio, ahora)) return;
      if (!lecturaGpsReciente(posicion.timestamp, ahora)) {
        ultimaPosicion = null;
        setEstado({ paso: "error", mensaje: "Sin lecturas recientes del GPS. Buscando tu ubicación de nuevo." });
        return;
      }
      if (ultimaMedicionEnviada === posicion.timestamp) return;
      enviando = true;
      ultimoEnvio = ahora;
      const respuesta = await enviarRef.current({
        lat: posicion.coords.latitude,
        lng: posicion.coords.longitude,
        precision: Number.isFinite(posicion.coords.accuracy) ? posicion.coords.accuracy : undefined,
        medidoEn: posicion.timestamp,
      }).catch(() => ({ ok: false, mensaje: "Sin conexión. Seguimos intentando." }));
      enviando = false;
      if (respuesta.ok) ultimaMedicionEnviada = posicion.timestamp;
      if (!vigente || ultimaPosicion !== posicion) return;
      if (!lecturaGpsReciente(posicion.timestamp, Date.now())) {
        setEstado({ paso: "error", mensaje: "La última ubicación enviada ya no es reciente. Esperando al GPS." });
        return;
      }
      setEstado(respuesta.ok ? { paso: "en-vivo" } : { paso: "error", mensaje: respuesta.mensaje ?? "No pudimos enviar tu ubicación." });
    }

    const recibir = (posicion: GeolocationPosition) => {
      if (!vigente) return;
      ultimaPosicion = posicion;
      void enviar();
    };
    const fallar = (fallo: GeolocationPositionError) => {
      if (!vigente) return;
      ultimaPosicion = null;
      setEstado({ paso: "error", mensaje: mensajeDeFallo(fallo.code) });
    };
    const vigilancia = navigator.geolocation.watchPosition(
      recibir,
      fallar,
      { enableHighAccuracy: true, maximumAge: INTERVALO_UBICACION_MS, timeout: 20_000 },
    );
    // Quieto también necesita una medición nueva: nunca se rejuvenece la anterior.
    const cada = setInterval(() => {
      void enviar();
      if (consultando || (ultimaPosicion && lecturaGpsReciente(ultimaPosicion.timestamp, Date.now()))) return;
      consultando = true;
      navigator.geolocation.getCurrentPosition(
        (posicion) => { consultando = false; recibir(posicion); },
        (fallo) => { consultando = false; fallar(fallo); },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
      );
    }, INTERVALO_UBICACION_MS);

    // Que la pantalla no se apague mientras dura el viaje (si el navegador lo permite).
    let bloqueo: WakeLockSentinel | null = null;
    const pedirPantalla = () => {
      if (document.visibilityState !== "visible" || !("wakeLock" in navigator)) return;
      navigator.wakeLock
        .request("screen")
        .then((b) => {
          if (vigente) bloqueo = b;
          else void b.release().catch(() => {});
        })
        .catch(() => {});
    };
    pedirPantalla();
    document.addEventListener("visibilitychange", pedirPantalla);

    return () => {
      vigente = false;
      navigator.geolocation.clearWatch(vigilancia);
      clearInterval(cada);
      document.removeEventListener("visibilitychange", pedirPantalla);
      void bloqueo?.release().catch(() => {});
    };
  }, [clave, conGps]);

  const error = !conGps
    ? `Este navegador no puede dar tu ubicación. ${quienVe} no te verá en el mapa.`
    : estado.paso === "error"
      ? estado.mensaje
      : null;

  return (
    <p role="status" className={`flex items-start gap-2.5 text-[13px] leading-relaxed ${error ? "text-error" : "text-texto-suave"}`}>
      <span
        aria-hidden="true"
        className={`mt-1.5 size-2 shrink-0 rounded-full ${error ? "bg-error" : estado.paso === "en-vivo" ? "bg-secundario motion-safe:animate-pulse" : "bg-texto-suave"}`}
      />
      {error ?? (estado.paso === "en-vivo" ? `${quienVe} ve tu ubicación en vivo. Deja esta pantalla abierta.` : "Buscando tu ubicación…")}
    </p>
  );
}
