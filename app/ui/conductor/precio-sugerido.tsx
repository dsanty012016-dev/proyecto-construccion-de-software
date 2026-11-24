"use client";

import { useEffect, useState } from "react";
import { pesos } from "@/app/lib/formato";
import { type Coordenada, distanciaKm } from "@/app/lib/mapa";
import { precioSugeridoPuesto, precioSugeridoViaje } from "@/app/lib/precio-sugerido";
import { buscarRuta } from "@/app/lib/ruta-vial";

// Muestra el precio sugerido según la distancia por las vías (OSRM). Si el
// servicio de rutas falla, usa la línea recta y lo dice ("aprox."). El botón
// solo copia el valor al campo: el conductor decide el precio.

interface Props {
  desde: Coordenada | null;
  hasta: Coordenada;
  tipo: "viaje" | "puesto";
  alUsar: (precio: number) => void;
}

export function PrecioSugerido({ desde, hasta, tipo, alUsar }: Props) {
  const [distancia, setDistancia] = useState<{ clave: string; km: number; porVias: boolean } | null>(null);
  const clave = desde ? `${desde.lat},${desde.lng};${hasta.lat},${hasta.lng}` : "";

  useEffect(() => {
    // Se recalcula solo cuando cambian los puntos (la clave), no en cada render.
    if (!clave) return;
    const [a, b] = clave.split(";").map((t) => {
      const [lat, lng] = t.split(",").map(Number);
      return { lat, lng };
    });
    let vigente = true;
    buscarRuta(a, b).then((ruta) => {
      if (!vigente) return;
      setDistancia(ruta ? { clave, km: ruta.km, porVias: true } : { clave, km: distanciaKm(a, b), porVias: false });
    });
    return () => {
      vigente = false;
    };
  }, [clave]);

  if (!desde) return null;
  const actual = distancia?.clave === clave ? distancia : null;
  const precio = actual ? (tipo === "viaje" ? precioSugeridoViaje(actual.km) : precioSugeridoPuesto(actual.km)) : null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-fondo px-4 py-3 text-sm" aria-live="polite">
      <p className="min-w-0 text-texto-suave">
        {actual && precio !== null ? (
          <>
            Sugerido para {actual.porVias ? "" : "aprox. "}
            {actual.km.toLocaleString("es-CO", { maximumFractionDigits: 1 })} km
            {tipo === "puesto" ? " (por puesto)" : ""}:{" "}
            <strong className="cifra text-base text-texto">{pesos(precio)}</strong>
          </>
        ) : (
          "Calculando precio sugerido…"
        )}
      </p>
      {precio !== null && (
        <button
          type="button"
          onClick={() => alUsar(precio)}
          className="min-h-11 shrink-0 rounded-full border border-secundario px-4 font-semibold text-secundario hover:bg-superficie"
        >
          Usar
        </button>
      )}
    </div>
  );
}
