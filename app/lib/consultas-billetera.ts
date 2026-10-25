import "server-only";
import { cache } from "react";
import { crearClienteServidor } from "./supabase/server";
import type { Database } from "./supabase/tipos";

// Lecturas de la billetera y del estado de la cuenta (strikes y suspensión).
// RLS (012) deja ver solo lo propio; los administradores ven los reportes.

export type FilaMovimiento = Database["public"]["Tables"]["movimientos"]["Row"];

/** Saldo, últimos movimientos y la hora de la consulta (para agruparlos por día). */
export async function miBilletera(personaId: string): Promise<{ saldo: number; movimientos: FilaMovimiento[]; ahora: number }> {
  const supabase = await crearClienteServidor();
  const [billetera, movimientos] = await Promise.all([
    supabase.from("billeteras").select("saldo").eq("persona_id", personaId).maybeSingle(),
    supabase.from("movimientos").select("*").eq("persona_id", personaId).order("creado_en", { ascending: false }).limit(30),
  ]);
  return { saldo: billetera.data?.saldo ?? 0, movimientos: movimientos.data ?? [], ahora: Date.now() };
}

// miSaldo y estadoDeCuenta van con cache(): las páginas las piden temprano
// (empiezan a la vez que el resto) y la pastilla del saldo y el aviso de
// strikes reciben ese mismo resultado sin volver a consultar.
export const miSaldo = cache(async (personaId: string): Promise<number> => {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("billeteras").select("saldo").eq("persona_id", personaId).maybeSingle();
  return data?.saldo ?? 0;
});

export interface EstadoDeCuenta {
  strikes: number;
  /** ISO de hasta cuándo está suspendido, o null. */
  suspendidoHasta: string | null;
}

export const estadoDeCuenta = cache(async (personaId: string): Promise<EstadoDeCuenta> => {
  const supabase = await crearClienteServidor();
  const ahora = new Date().toISOString();
  const [strikes, suspension] = await Promise.all([
    supabase.from("strikes").select("id", { count: "exact", head: true }).eq("persona_id", personaId).eq("vigente", true),
    supabase.from("suspensiones").select("hasta").eq("persona_id", personaId).gt("hasta", ahora).order("hasta", { ascending: false }).limit(1),
  ]);
  return { strikes: strikes.count ?? 0, suspendidoHasta: suspension.data?.[0]?.hasta ?? null };
});

export interface ReporteParaAdmin {
  id: string;
  motivo: string;
  creadoEn: string;
  autor: string;
  sobre: string;
}

/** Reportes de mal comportamiento, para el panel de administración. */
export async function reportesRecientes(): Promise<ReporteParaAdmin[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("reportes").select("*").order("creado_en", { ascending: false }).limit(30);
  const lista = data ?? [];
  if (lista.length === 0) return [];
  const ids = [...new Set(lista.flatMap((r) => [r.autor_id, r.sobre_id]))];
  const { data: perfiles } = await supabase.from("perfiles").select("id, nombre").in("id", ids);
  const nombre = (id: string) => perfiles?.find((p) => p.id === id)?.nombre ?? "Alguien";
  return lista.map((r) => ({ id: r.id, motivo: r.motivo, creadoEn: r.creado_en, autor: nombre(r.autor_id), sobre: nombre(r.sobre_id) }));
}
