"use client";

import { useState } from "react";
import { coordenadaValida, type Coordenada } from "@/app/lib/mapa";

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
    if (!navigator.geolocation) {
      setEstado({ paso: "error", mensaje: "Este navegador no puede darnos tu ubicación. Elige el punto moviendo el mapa." });
      return;
    }
    setEstado({ paso: "buscando" });
    try {
      navigator.geolocation.getCurrentPosition(
      (posicion) => {
        const punto = { lat: posicion.coords.latitude, lng: posicion.coords.longitude };
        if (!coordenadaValida(punto)) {
          setEstado({ paso: "error", mensaje: "La ubicación recibida no es válida. Reintenta o elige el punto en el mapa." });
          return;
        }
        alEncontrar(punto);
        setEstado({ paso: "quieto" });
      },
      (fallo) => setEstado({ paso: "error", mensaje: mensajeDeFallo(fallo.code) }),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
      );
    } catch {
      setEstado({ paso: "error", mensaje: "No pudimos solicitar tu ubicación. Reintenta o elige el punto en el mapa." });
    }
  }

  return { estado, pedir };
}
