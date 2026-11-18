import "server-only";
import { crearClienteServidor } from "./supabase/server";

export async function contadoresAdmin() {
  const supabase = await crearClienteServidor();
  const [retiros, documentos, reportes, incidencias] = await Promise.all([
    supabase.from("retiros").select("id", { head: true, count: "exact" }).eq("estado", "solicitado"),
    supabase.from("documentos_conductor").select("id", { head: true, count: "exact" }).eq("estado", "pendiente"),
    supabase.from("reportes").select("id", { head: true, count: "exact" }),
    supabase.rpc("historial_incidencias_pago", { p_resueltas: false, p_pagina: 1 }).limit(1),
  ]);
  if (retiros.error || documentos.error || reportes.error || incidencias.error) {
    throw new Error("No pudimos consultar los contadores de administración.");
  }
  return {
    retiros: retiros.count ?? 0,
    documentos: documentos.count ?? 0,
    reportes: reportes.count ?? 0,
    incidencias: incidencias.data?.[0]?.total ?? 0,
  };
}
