"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Posicion } from "@/app/lib/acciones-seguimiento";
import { INTERVALO_UBICACION_MS, tocaEnviar } from "@/app/lib/seguimiento";

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
  const ultimaPosicion = useRef<GeolocationPosition | null>(null);
  const ultimoEnvio = useRef<number | null>(null);
  const enviando = useRef(false);

  useEffect(() => {
    if (!conGps) return;

    async function enviar() {
      const posicion = ultimaPosicion.current;
      const ahora = Date.now();
      if (!posicion || enviando.current || !tocaEnviar(ultimoEnvio.current, ahora)) return;
      enviando.current = true;
      ultimoEnvio.current = ahora;
      const respuesta = await enviarRef.current({
        lat: posicion.coords.latitude,
        lng: posicion.coords.longitude,
        precision: Number.isFinite(posicion.coords.accuracy) ? posicion.coords.accuracy : undefined,
      }).catch(() => ({ ok: false, mensaje: "Sin conexión. Seguimos intentando." }));
      enviando.current = false;
      setEstado(respuesta.ok ? { paso: "en-vivo" } : { paso: "error", mensaje: respuesta.mensaje ?? "No pudimos enviar tu ubicación." });
    }

    const vigilancia = navigator.geolocation.watchPosition(
      (posicion) => {
        ultimaPosicion.current = posicion;
        void enviar();
      },
      (fallo) => setEstado({ paso: "error", mensaje: mensajeDeFallo(fallo.code) }),
      { enableHighAccuracy: true, maximumAge: INTERVALO_UBICACION_MS, timeout: 20_000 },
    );
    // Por si el teléfono está quieto y no avisa: se reenvía la última cada 5 s.
    const cada = setInterval(() => void enviar(), INTERVALO_UBICACION_MS);

    // Que la pantalla no se apague mientras dura el viaje (si el navegador lo permite).
    let bloqueo: WakeLockSentinel | null = null;
    const pedirPantalla = () => {
      if (document.visibilityState !== "visible" || !("wakeLock" in navigator)) return;
      navigator.wakeLock
        .request("screen")
        .then((b) => {
          bloqueo = b;
        })
        .catch(() => {});
    };
    pedirPantalla();
    document.addEventListener("visibilitychange", pedirPantalla);

    return () => {
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
