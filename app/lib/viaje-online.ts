"use client";

import { useEffect, useId, useRef } from "react";
import { crearClienteNavegador } from "./supabase/client";

// Tiempo real con Supabase Realtime: avisa cuando cambia una fila de viajes u
// ofertas que la persona puede ver. Realtime respeta las políticas RLS, así que
// cada quien solo recibe lo suyo (004-viajes.sql); las tablas están en la
// publicación "supabase_realtime" (008-tiempo-real.sql).

export interface Escucha {
  tabla: "viajes" | "ofertas" | "cupos" | "puestos";
  /** Filtro de Realtime, por ejemplo "id=eq.<uuid>". Sin filtro: toda la tabla visible. */
  filtro?: string;
}

/**
 * Llama a `alCambiar` (agrupando ráfagas de cambios) cada vez que llega un
 * cambio. Devuelve nada: la pantalla vuelve a pedir sus datos al servidor.
 */
export function useCambiosEnVivo(escuchas: readonly Escucha[], alCambiar: () => void) {
  const id = useId();
  const alCambiarRef = useRef(alCambiar);
  useEffect(() => {
    alCambiarRef.current = alCambiar;
  });

  // La lista se compara por contenido para no resuscribirse en cada render.
  const clave = JSON.stringify(escuchas);

  useEffect(() => {
    const lista: Escucha[] = JSON.parse(clave);
    if (lista.length === 0) return;
    const supabase = crearClienteNavegador();
    let espera: ReturnType<typeof setTimeout> | undefined;
    let canal: ReturnType<typeof supabase.channel> | null = null;
    let cancelado = false;

    const avisar = () => {
      clearTimeout(espera);
      espera = setTimeout(() => alCambiarRef.current(), 300);
    };

    (async () => {
      // Realtime necesita el token de la sesión para aplicar RLS.
      const { data } = await supabase.auth.getSession();
      if (cancelado || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      if (cancelado) return;

      canal = supabase.channel(`cambios${id}`);
      for (const escucha of lista) {
        const opciones: { event: "*"; schema: string; table: string; filter?: string } = {
          event: "*",
          schema: "public",
          table: escucha.tabla,
        };
        if (escucha.filtro) opciones.filter = escucha.filtro;
        canal = canal.on("postgres_changes", opciones, avisar);
      }
      canal.subscribe();
    })();

    return () => {
      cancelado = true;
      clearTimeout(espera);
      if (canal) supabase.removeChannel(canal);
    };
  }, [clave, id]);
}
