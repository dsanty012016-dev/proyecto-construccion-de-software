import "server-only";
import { cache } from "react";
import { crearClienteServidor } from "./supabase/server";
import type { Database } from "./supabase/tipos";

// Lecturas de la billetera y del estado de la cuenta (strikes y suspensión).
// RLS (012) deja ver solo lo propio; los administradores ven los reportes.

export type FilaMovimiento = Database["public"]["Tables"]["movimientos"]["Row"];
export type FilaRecarga = Database["public"]["Tables"]["recargas"]["Row"];

/** Una recarga propia por su referencia (RLS no deja ver las de otros). */
export async function miRecarga(referencia: string): Promise<FilaRecarga | null> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("recargas").select("*").eq("id", referencia).maybeSingle();
  if (error) throw new Error("No pudimos consultar la recarga. Intenta de nuevo.");
  return data;
}

/** Pendientes recientes, sin ocultar las que llevan más de media hora. */
export async function recargasEnProceso(personaId: string): Promise<FilaRecarga[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("recargas")
    .select("*")
    .eq("persona_id", personaId)
    .eq("estado", "pendiente")
    .order("creada_en", { ascending: false })
    .limit(5);
  if (error) throw new Error("No pudimos consultar tus recargas. Intenta de nuevo.");
  return data ?? [];
}

export async function historialDeRecargas(personaId: string, pagina: number): Promise<{ recargas: FilaRecarga[]; total: number }> {
  const supabase = await crearClienteServidor();
  const inicio = (pagina - 1) * 20;
  const { data, error, count } = await supabase.from("recargas").select("*", { count: "exact" })
    .eq("persona_id", personaId).order("creada_en", { ascending: false }).order("id").range(inicio, inicio + 19);
  if (error) throw new Error("No pudimos consultar el historial de recargas.");
  return { recargas: data ?? [], total: count ?? 0 };
}

/** Saldo, últimos movimientos y la hora de la consulta (para agruparlos por día). */
export async function miBilletera(personaId: string): Promise<{ saldo: number; movimientos: FilaMovimiento[]; ahora: number }> {
  const supabase = await crearClienteServidor();
  const [billetera, movimientos] = await Promise.all([
    supabase.from("billeteras").select("saldo").eq("persona_id", personaId).maybeSingle(),
    supabase.from("movimientos").select("*").eq("persona_id", personaId).order("creado_en", { ascending: false }).limit(30),
  ]);
  if (billetera.error || movimientos.error) throw new Error("No pudimos cargar tu billetera. Tu saldo no se ha cambiado.");
  return { saldo: billetera.data?.saldo ?? 0, movimientos: movimientos.data ?? [], ahora: Date.now() };
}

// miSaldo y estadoDeCuenta van con cache(): las páginas las piden temprano
// (empiezan a la vez que el resto) y la pastilla del saldo y el aviso de
// strikes reciben ese mismo resultado sin volver a consultar.
export const miSaldo = cache(async (personaId: string): Promise<number> => {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("billeteras").select("saldo").eq("persona_id", personaId).maybeSingle();
  if (error) throw new Error("No pudimos consultar tu saldo.");
  return data?.saldo ?? 0;
});

export interface EstadoDeCuenta {
  strikes: number;
  /** ISO de hasta cuándo está suspendido, o null. */
  suspendidoHasta: string | null;
}

export const FALTAS_POR_PAGINA = 20;

/** Historial propio, incluidas las faltas que generaron una suspensión anterior. */
export async function historialDeFaltas(personaId: string, pagina: number) {
  const supabase = await crearClienteServidor();
  const inicio = (pagina - 1) * FALTAS_POR_PAGINA;
  const { data, error, count } = await supabase.from("strikes")
    .select("id,motivo,creado_en,vigente", { count: "exact" })
    .eq("persona_id", personaId)
    .order("creado_en", { ascending: false }).order("id")
    .range(inicio, inicio + FALTAS_POR_PAGINA - 1);
  if (error) throw new Error("No pudimos consultar tu historial de faltas.");
  return { faltas: data ?? [], total: count ?? 0 };
}

export const estadoDeCuenta = cache(async (personaId: string): Promise<EstadoDeCuenta> => {
  const supabase = await crearClienteServidor();
  const ahora = new Date().toISOString();
  const [strikes, suspension] = await Promise.all([
    supabase.from("strikes").select("id", { count: "exact", head: true }).eq("persona_id", personaId).eq("vigente", true),
    supabase.from("suspensiones").select("hasta").eq("persona_id", personaId).gt("hasta", ahora).order("hasta", { ascending: false }).limit(1),
  ]);
  if (strikes.error || suspension.error) throw new Error("No pudimos consultar el estado de tu cuenta.");
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
export async function reportesRecientes(pagina = 1): Promise<ReporteParaAdmin[]> {
  const supabase = await crearClienteServidor();
  const inicio = (pagina - 1) * 20;
  const { data } = await supabase.from("reportes").select("*").order("creado_en", { ascending: false })
    .order("id").range(inicio, inicio + 19).throwOnError();
  const lista = data ?? [];
  if (lista.length === 0) return [];
  const ids = [...new Set(lista.flatMap((r) => [r.autor_id, r.sobre_id]))];
  const { data: perfiles } = await supabase.from("perfiles").select("id, nombre").in("id", ids).throwOnError();
  const nombre = (id: string) => perfiles?.find((p) => p.id === id)?.nombre ?? "Alguien";
  return lista.map((r) => ({ id: r.id, motivo: r.motivo, creadoEn: r.creado_en, autor: nombre(r.autor_id), sobre: nombre(r.sobre_id) }));
}
