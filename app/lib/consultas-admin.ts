import "server-only";
import { crearClienteServidor } from "./supabase/server";

export async function resumenOperativo() {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("resumen_operativo");
  if (error || !data?.[0]) return null;
  return data[0];
}

export async function contadoresAdmin() {
  const supabase = await crearClienteServidor();
  const [retiros, documentos, reportes, incidencias, emergencias] = await Promise.all([
    supabase.from("retiros").select("id", { head: true, count: "exact" }).eq("estado", "solicitado"),
    supabase.from("documentos_conductor").select("id", { head: true, count: "exact" }).eq("estado", "pendiente"),
    supabase.from("reportes").select("id", { head: true, count: "exact" }),
    supabase.rpc("historial_incidencias_pago", { p_resueltas: false, p_pagina: 1 }).limit(1),
    supabase.from("emergencias").select("id", { head: true, count: "exact" }).is("atendida_en", null),
  ]);
  if (retiros.error || documentos.error || reportes.error || incidencias.error || emergencias.error) {
    throw new Error("No pudimos consultar los contadores de administración.");
  }
  return {
    retiros: retiros.count ?? 0,
    documentos: documentos.count ?? 0,
    reportes: reportes.count ?? 0,
    incidencias: incidencias.data?.[0]?.total ?? 0,
    emergencias: emergencias.count ?? 0,
  };
}

export interface EmergenciaParaAdmin {
  id: string;
  creadaEn: string;
  autor: string;
  rol: string;
  telefono: string | null;
  donde: "viaje" | "cupo";
  lat: number | null;
  lng: number | null;
}

/** Avisos de emergencia sin atender (037), el más reciente primero. */
export async function emergenciasPendientes(pagina = 1): Promise<EmergenciaParaAdmin[]> {
  const supabase = await crearClienteServidor();
  const inicio = (pagina - 1) * 20;
  const { data } = await supabase.from("emergencias").select("*").is("atendida_en", null)
    .order("creada_en", { ascending: false }).order("id").range(inicio, inicio + 19).throwOnError();
  const lista = data ?? [];
  if (lista.length === 0) return [];
  const ids = [...new Set(lista.map((e) => e.autor_id))];
  const { data: perfiles } = await supabase.from("perfiles").select("id, nombre, telefono, rol").in("id", ids).throwOnError();
  return lista.map((e) => {
    const p = perfiles?.find((x) => x.id === e.autor_id);
    return {
      id: e.id,
      creadaEn: e.creada_en,
      autor: p?.nombre ?? "Alguien",
      rol: p?.rol ?? "",
      telefono: p?.telefono ?? null,
      donde: e.viaje_id ? "viaje" : "cupo",
      lat: e.lat,
      lng: e.lng,
    };
  });
}
