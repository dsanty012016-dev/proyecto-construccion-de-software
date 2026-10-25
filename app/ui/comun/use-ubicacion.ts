"use client";

import { useState } from "react";
import type { Coordenada } from "@/app/lib/mapa";

// Atajo "Usar mi ubicación": pide la posición al navegador y avisa con un
// mensaje claro si no se puede. El punto de verdad se elige en el mapa.

export type EstadoUbicacion = { paso: "quieto" } | { paso: "buscando" } | { paso: "error"; mensaje: string };

function mensajeDeFallo(codigo: number): string {
  if (codigo === 1) return "El navegador no nos dejó leer tu ubicación. Elige el punto moviendo el mapa.";
  if (codigo === 2) return "Tu dispositivo no pudo calcular dónde estás. Elige el punto moviendo el mapa.";
  if (codigo === 3) return "La ubicación tardó demasiado. Elige el punto moviendo el mapa o inténtalo de nuevo.";
  return "No pudimos leer tu ubicación. Elige el punto moviendo el mapa.";
}

export function useUbicacion(alEncontrar: (punto: Coordenada) => void) {
  const [estado, setEstado] = useState<EstadoUbicacion>({ paso: "quieto" });

  function pedir() {
    if (!("geolocation" in navigator)) {
      setEstado({ paso: "error", mensaje: "Este navegador no puede darnos tu ubicación. Elige el punto moviendo el mapa." });
      return;
    }
    setEstado({ paso: "buscando" });
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        alEncontrar({ lat: posicion.coords.latitude, lng: posicion.coords.longitude });
        setEstado({ paso: "quieto" });
      },
      (fallo) => setEstado({ paso: "error", mensaje: mensajeDeFallo(fallo.code) }),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    );
  }

  return { estado, pedir };
}
