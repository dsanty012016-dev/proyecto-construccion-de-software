"use server";

import { z } from "zod";
import type { RolAsistente } from "./asistente";
import { esIdLogro, logrosAlcanzados, logrosPorCelebrar, type IdLogro } from "./mascota";
import { crearClienteServidor } from "./supabase/server";

// Server Actions de los logros de Uni. La base cuenta los viajes y guarda qué
// celebraciones ya se vieron (035); la regla de qué logro se alcanza está en
// app/lib/mascota.ts. Si algo falla, no se celebra nada: nunca bloquea la app.

const esquemaConteo = z.object({
  viajes_estudiante: z.coerce.number().int().min(0),
  viajes_conductor: z.coerce.number().int().min(0),
  cinco_estrellas: z.coerce.number().int().min(0),
  celebrados: z.array(z.string()),
});

/** Logros alcanzados en el rol actual que aún no se celebraron, en orden. */
export async function logrosPendientes(): Promise<IdLogro[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return [];

  // RLS: cada quien solo lee su propio perfil.
  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", id).single();
  if (perfil?.rol !== "estudiante" && perfil?.rol !== "conductor") return [];
  const rol: RolAsistente = perfil.rol;

  const { data: crudo, error } = await supabase.rpc("mis_logros");
  const conteo = esquemaConteo.safeParse(crudo);
  if (error || !conteo.success) return [];

  const alcanzados = logrosAlcanzados(
    {
      viajesEstudiante: conteo.data.viajes_estudiante,
      viajesConductor: conteo.data.viajes_conductor,
      cincoEstrellas: conteo.data.cinco_estrellas,
    },
    rol,
  );
  return logrosPorCelebrar(alcanzados, conteo.data.celebrados);
}

/** Guarda que la persona ya vio la celebración de ese logro. */
export async function celebrarLogro(logro: string): Promise<void> {
  if (!esIdLogro(logro)) return;
  const supabase = await crearClienteServidor();
  await supabase.rpc("celebrar_logro", { p_logro: logro });
}
