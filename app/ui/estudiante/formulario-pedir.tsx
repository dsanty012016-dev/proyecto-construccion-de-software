"use client";

import { useActionState, useState } from "react";
import { pedirViaje } from "@/app/lib/acciones-viaje";
import { ESTADO_INICIAL } from "@/app/lib/estado-formulario";
import { type Coordenada, distanciaKm, distanciaTexto, redondear } from "@/app/lib/mapa";
import { Aviso, BotonEnviar, Campo } from "@/app/ui/auth/campos";
import { IconoCheck, IconoUbicacion } from "@/app/ui/comun/iconos-app";
import { Mapa } from "@/app/ui/comun/mapa";
import { RutaViaje } from "@/app/ui/comun/ruta-viaje";

// Formulario para pedir un viaje. El punto de recogida se elige en el mapa
// (moviendo el mapa hasta dejar el pin encima, o tocando un sitio). La
// ubicación del celular es solo un atajo para llevar el mapa hasta ahí.

/** Menos de esto ya es la universidad: no tiene sentido pedir el viaje. */
const DISTANCIA_MINIMA_KM = 0.1;

type EstadoGps = { paso: "quieto" } | { paso: "buscando" } | { paso: "error"; mensaje: string };

/** Códigos de GeolocationPositionError: 1 permiso, 2 sin señal, 3 tardó demasiado. */
function mensajeDeFallo(codigo: number): string {
  if (codigo === 1) return "El navegador no nos dejó leer tu ubicación. Elige el punto moviendo el mapa.";
  if (codigo === 2) return "Tu dispositivo no pudo calcular dónde estás. Elige el punto moviendo el mapa.";
  if (codigo === 3) return "La ubicación tardó demasiado. Elige el punto moviendo el mapa o inténtalo de nuevo.";
  return "No pudimos leer tu ubicación. Elige el punto moviendo el mapa.";
}

interface Sede {
  nombre: string;
  lat: number;
  lng: number;
}

export function FormularioPedir({ sede }: { sede: Sede }) {
  const [estado, accion] = useActionState(pedirViaje, ESTADO_INICIAL);
  const [punto, setPunto] = useState<Coordenada | null>(null);
  const [irA, setIrA] = useState<Coordenada | null>(null);
  const [gps, setGps] = useState<EstadoGps>({ paso: "quieto" });
  const errores = estado.errores ?? {};
  const valores = estado.valores ?? {};

  const destino = { lat: sede.lat, lng: sede.lng };
  const distancia = punto ? distanciaKm(punto, destino) : null;
  const muyCerca = distancia !== null && distancia < DISTANCIA_MINIMA_KM;
  const listo = punto !== null && !muyCerca;
  const guardado = punto ? redondear(punto) : null;

  function usarMiUbicacion() {
    if (!("geolocation" in navigator)) {
      setGps({ paso: "error", mensaje: "Este navegador no puede darnos tu ubicación. Elige el punto moviendo el mapa." });
      return;
    }
    setGps({ paso: "buscando" });
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        const aqui = { lat: posicion.coords.latitude, lng: posicion.coords.longitude };
        setIrA(aqui);
        setPunto(aqui);
        setGps({ paso: "quieto" });
      },
      (fallo) => setGps({ paso: "error", mensaje: mensajeDeFallo(fallo.code) }),
      // Sin "alta precisión": responde rápido en computadores sin GPS.
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    );
  }

  return (
    <form action={accion} className="space-y-6" noValidate>
      {estado.resultado === "error" && estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}

      <section aria-labelledby="titulo-punto" className="space-y-3">
        <div>
          <h2 id="titulo-punto" className="text-base">
            1. ¿Dónde te recogemos?
          </h2>
          <p id="ayuda-mapa" className="text-sm text-texto-suave">
            Mueve el mapa hasta que el pin quede en tu punto de recogida, o toca el sitio.
          </p>
        </div>

        <Mapa
          etiqueta="Mapa para elegir el punto de recogida"
          centro={destino}
          destino={destino}
          alElegir={setPunto}
          irA={irA}
          className="h-72"
        />

        <p role="status" className={`flex items-center gap-2 text-sm ${muyCerca ? "text-error" : "text-texto"}`}>
          {punto && !muyCerca && <IconoCheck className="size-5 shrink-0 text-secundario" />}
          {!punto
            ? "Todavía no has elegido el punto."
            : muyCerca
              ? "Ese punto es la universidad. Mueve el mapa hasta donde estás."
              : `Punto elegido · a ${distanciaTexto(distancia ?? 0)} de la universidad en línea recta.`}
        </p>
        {gps.paso === "error" && <Aviso tipo="error">{gps.mensaje}</Aviso>}
        {errores.origen_lat && <Aviso tipo="error">{errores.origen_lat}</Aviso>}

        <button
          type="button"
          onClick={usarMiUbicacion}
          disabled={gps.paso === "buscando"}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-texto-suave/30 font-semibold text-texto transition-colors hover:bg-superficie disabled:opacity-70"
        >
          <IconoUbicacion className="size-5" />
          {gps.paso === "buscando" ? "Buscando tu ubicación…" : "Usar mi ubicación actual"}
        </button>
        <input type="hidden" name="origen_lat" value={guardado?.lat ?? ""} />
        <input type="hidden" name="origen_lng" value={guardado?.lng ?? ""} />
      </section>

      <section aria-labelledby="titulo-direccion" className="space-y-4">
        <h2 id="titulo-direccion" className="text-base">
          2. Ayuda al conductor a encontrarte
        </h2>
        <Campo
          etiqueta="Dirección o barrio"
          name="direccion"
          placeholder="Ej.: Cra. 33 #15-20, Barzal"
          defaultValue={valores.direccion}
          error={errores.direccion}
          maxLength={120}
          autoComplete="street-address"
        />
        <Campo
          etiqueta="Referencia (opcional)"
          name="referencia"
          placeholder="Ej.: frente a la panadería, portón azul"
          defaultValue={valores.referencia}
          error={errores.referencia}
          maxLength={70}
        />
      </section>

      <section aria-labelledby="titulo-destino" className="space-y-3 rounded-2xl bg-superficie p-4">
        <h2 id="titulo-destino" className="text-base">
          Tu viaje
        </h2>
        <RutaViaje origen="El punto que elegiste en el mapa" destino={sede.nombre} />
        <p className="text-sm text-texto-suave">Los conductores te enviarán su precio. Tú eliges la oferta que más te sirva.</p>
      </section>

      <BotonEnviar enviando="Buscando conductores…" deshabilitado={!listo}>
        Buscar conductores
      </BotonEnviar>
      {!punto && <p className="text-center text-sm text-texto-suave">Primero elige tu punto de recogida en el mapa.</p>}
    </form>
  );
}
