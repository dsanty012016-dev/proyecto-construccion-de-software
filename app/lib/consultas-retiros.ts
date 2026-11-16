import "server-only";
import type { Database } from "./supabase/tipos";
import { crearClienteServidor } from "./supabase/server";

export type FilaRetiro = Database["public"]["Tables"]["retiros"]["Row"];
export async function opcionesDeRetiro() {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("opciones_de_retiro");
  if (error || !data?.[0]) throw new Error("No pudimos consultar tus ganancias disponibles.");
  return data[0];
}
export async function misRetiros(personaId: string, pagina: number) {
  const supabase = await crearClienteServidor();
  const inicio = (pagina - 1) * 20;
  const { data, error, count } = await supabase.from("retiros").select("*", { count: "exact" })
    .eq("conductor_id", personaId).order("solicitado_en", { ascending: false }).order("id").range(inicio, inicio + 19);
  if (error) throw new Error("No pudimos consultar tus retiros.");
  return { retiros: data ?? [], total: count ?? 0 };
}
export async function retirosPorRevisar() {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("retiros").select("*").eq("estado", "solicitado").order("plazo_hasta").limit(50);
  if (error) throw new Error("No pudimos consultar los retiros pendientes.");
  const lista = data ?? [];
  if (!lista.length) return [];
  const ids = [...new Set(lista.map((retiro) => retiro.conductor_id))];
  const { data: perfiles, error: falloPerfil } = await supabase.from("perfiles").select("id, nombre").in("id", ids);
  if (falloPerfil) throw new Error("No pudimos consultar los conductores de los retiros.");
  return lista.map((retiro) => ({ ...retiro, nombre: perfiles?.find((p) => p.id === retiro.conductor_id)?.nombre ?? "Conductor" }));
}
export async function incidenciasDePago() {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("incidencias_de_pago");
  if (error) throw new Error("No pudimos consultar los pagos que necesitan revisión.");
  return data ?? [];
}

export async function cedulasParaRevisarRetiros(conductores: string[]) {
  const mapa = new Map<string, string>();
  if (!conductores.length) return mapa;
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("documentos_conductor").select("conductor_id, ruta")
    .eq("tipo", "cedula").eq("estado", "aprobado").in("conductor_id", [...new Set(conductores)]);
  if (error) throw new Error("No pudimos consultar las cédulas para revisar los retiros.");
  if (!data?.length) return mapa;
  const enlaces = await supabase.storage.from("documentos").createSignedUrls(data.map((documento) => documento.ruta), 300);
  if (enlaces.error) throw new Error("No pudimos abrir la documentación de los retiros.");
  for (const documento of data) {
    const enlace = enlaces.data?.find((e) => e.path === documento.ruta)?.signedUrl;
    if (enlace) mapa.set(documento.conductor_id, enlace);
  }
  return mapa;
}
