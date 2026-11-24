"use client";

import { useState } from "react";
import type { Coordenada } from "@/app/lib/mapa";
import { enlaceGoogleMaps, enlaceWaze } from "@/app/lib/navegacion";
import { Mapa } from "@/app/ui/comun/mapa";

// Antes de salir, el conductor ve cómo llegar desde donde está hasta su primer
// punto: la U en el regreso, su primera recogida en la ida. Su ubicación solo
// se lee en el teléfono para dibujar la ruta (no se envía a nadie; eso es
// "Voy para la U" o "Salir"). Y puede abrir la ruta en Google Maps o Waze.

type Estado = { paso: "inicial" } | { paso: "buscando" } | { paso: "listo"; aqui: Coordenada } | { paso: "error"; mensaje: string };

function mensajeDeFallo(codigo: number): string {
  if (codigo === 1) return "El navegador no deja leer tu ubicación. Dale permiso o abre la ruta en Google Maps o Waze.";
  if (codigo === 3) return "Tu ubicación está tardando. Revisa que el GPS esté encendido.";
  return "No pudimos saber dónde estás. Revisa que el GPS esté encendido.";
}

export function RutaHastaPunto({ destino, nombre, esLaU }: { destino: Coordenada; nombre: string; esLaU: boolean }) {
  const [estado, setEstado] = useState<Estado>({ paso: "inicial" });

  function verRuta() {
    if (!("geolocation" in navigator)) {
      setEstado({ paso: "error", mensaje: "Este navegador no da la ubicación. Abre la ruta en Google Maps o Waze." });
      return;
    }
    setEstado({ paso: "buscando" });
    navigator.geolocation.getCurrentPosition(
      (posicion) => setEstado({ paso: "listo", aqui: { lat: posicion.coords.latitude, lng: posicion.coords.longitude } }),
      (fallo) => setEstado({ paso: "error", mensaje: mensajeDeFallo(fallo.code) }),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  }

  const enlace = "flex min-h-12 items-center justify-center rounded-xl border border-texto-suave/30 px-3 text-center text-sm font-semibold text-texto hover:bg-superficie";

  return (
    <section aria-labelledby="titulo-ruta-hasta" className="space-y-3 rounded-2xl border border-linea bg-superficie p-4">
      <h2 id="titulo-ruta-hasta" className="text-base">Cómo llegar a {nombre}</h2>
      {estado.paso === "listo" ? (
        <div className="-mx-4 overflow-hidden">
          <Mapa
            etiqueta={`Ruta desde donde estás hasta ${nombre}`}
            centro={estado.aqui}
            origen={estado.aqui}
            destino={destino}
            vehiculo={estado.aqui}
            uEnElOrigen={!esLaU}
            sinMarcadorOrigen
            className="h-56"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={verRuta}
          disabled={estado.paso === "buscando"}
          className="min-h-12 w-full rounded-xl border border-secundario px-3 text-sm font-semibold text-secundario hover:bg-fondo disabled:opacity-60"
        >
          {estado.paso === "buscando" ? "Buscando dónde estás…" : `Ver mi ruta hasta ${nombre}`}
        </button>
      )}
      {estado.paso === "error" && (
        <p role="alert" className="text-sm text-error">
          {estado.mensaje}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <a href={enlaceGoogleMaps(destino)} target="_blank" rel="noopener noreferrer" className={enlace}>
          Abrir en Google Maps
        </a>
        <a href={enlaceWaze(destino)} target="_blank" rel="noopener noreferrer" className={enlace}>
          Abrir en Waze
        </a>
      </div>
      <p className="text-xs text-texto-suave">Tu ubicación solo se usa en tu teléfono para dibujar la ruta.</p>
    </section>
  );
}
