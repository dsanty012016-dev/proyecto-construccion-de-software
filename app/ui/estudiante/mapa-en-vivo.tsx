"use client";

import { useEffect, useState } from "react";
import type { Coordenada } from "@/app/lib/mapa";
import { INTERVALO_UBICACION_MS, textoUbicacion } from "@/app/lib/seguimiento";
import { crearClienteNavegador } from "@/app/lib/supabase/client";
import { Mapa } from "@/app/ui/comun/mapa";

// Mapa del viaje con el conductor moviéndose en vivo. La primera ubicación
// llega del servidor y las siguientes por Realtime (RLS: solo el estudiante y
// el conductor de ese viaje las reciben, 013).

export interface UbicacionEnVivo {
  lat: number;
  lng: number;
  actualizado_en: string;
}

function masReciente(a: UbicacionEnVivo | null, b: UbicacionEnVivo | null) {
  if (!a) return b;
  if (!b) return a;
  return Date.parse(b.actualizado_en) > Date.parse(a.actualizado_en) ? b : a;
}

export function MapaEnVivo({
  viajeId,
  origen,
  destino,
  inicial,
  ahoraInicial,
  className,
}: {
  viajeId: string;
  origen: Coordenada;
  destino: Coordenada;
  inicial: UbicacionEnVivo | null;
  /** Hora del servidor al cargar, para que el texto coincida al hidratar. */
  ahoraInicial: number;
  className?: string;
}) {
  const [enVivo, setEnVivo] = useState<UbicacionEnVivo | null>(null);
  const [borrada, setBorrada] = useState(false);
  const [ahora, setAhora] = useState(ahoraInicial);

  // El texto "hace X s" avanza solo.
  useEffect(() => {
    const cada = setInterval(() => setAhora(Date.now()), INTERVALO_UBICACION_MS);
    return () => clearInterval(cada);
  }, []);

  useEffect(() => {
    const supabase = crearClienteNavegador();
    let canal: ReturnType<typeof supabase.channel> | null = null;
    let cancelado = false;
    (async () => {
      // Realtime necesita el token de la sesión para aplicar RLS.
      const { data } = await supabase.auth.getSession();
      if (cancelado || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      if (cancelado) return;
      canal = supabase
        .channel(`ubicacion-${viajeId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "ubicaciones_viaje", filter: `viaje_id=eq.${viajeId}` },
          (cambio) => {
            if (cambio.eventType === "DELETE") {
              setBorrada(true);
              return;
            }
            const fila = cambio.new as Partial<UbicacionEnVivo>;
            if (typeof fila.lat === "number" && typeof fila.lng === "number" && typeof fila.actualizado_en === "string") {
              setBorrada(false);
              setEnVivo({ lat: fila.lat, lng: fila.lng, actualizado_en: fila.actualizado_en });
            }
          },
        )
        .subscribe();
    })();
    return () => {
      cancelado = true;
      if (canal) supabase.removeChannel(canal);
    };
  }, [viajeId]);

  const actual = borrada ? null : masReciente(inicial, enVivo);
  const texto = textoUbicacion(actual ? Date.parse(actual.actualizado_en) : null, ahora);

  return (
    <div className={`relative ${className ?? "h-72"}`}>
      <Mapa
        etiqueta="Mapa del viaje con la ubicación del conductor"
        centro={origen}
        origen={origen}
        destino={destino}
        vehiculo={actual ? { lat: actual.lat, lng: actual.lng } : null}
        aRas
        className="h-full"
      />
      <p
        role="status"
        className="absolute top-4 right-4 z-10 flex items-center gap-2 rounded-full bg-fondo px-3 py-2 text-xs font-semibold text-texto"
      >
        <span aria-hidden="true" className={`size-2 rounded-full ${texto === "Ubicación en vivo" ? "bg-secundario motion-safe:animate-pulse" : "bg-texto-suave"}`} />
        {texto}
      </p>
    </div>
  );
}
