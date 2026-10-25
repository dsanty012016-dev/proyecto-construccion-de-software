import "server-only";
import { tokenValido } from "./seguimiento";
import { crearClienteServidor } from "./supabase/server";
import type { Database } from "./supabase/tipos";

// Lecturas del seguimiento (013). RLS deja ver la ubicación solo al estudiante
// y al conductor del viaje activo; el enlace compartido se lee con una función
// que devuelve solo lo necesario, también sin sesión.

export type FilaUbicacion = Database["public"]["Tables"]["ubicaciones_viaje"]["Row"];
export type ViajeCompartido = Database["public"]["Functions"]["viaje_compartido"]["Returns"][number];

export async function ubicacionDelViaje(viajeId: string): Promise<FilaUbicacion | null> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("ubicaciones_viaje").select("*").eq("viaje_id", viajeId).maybeSingle();
  return data;
}

/** La ubicación más la hora de la consulta (para el texto "hace X s" al cargar). */
export async function ubicacionConHora(viajeId: string): Promise<{ ubicacion: FilaUbicacion | null; ahora: number }> {
  return { ubicacion: await ubicacionDelViaje(viajeId), ahora: Date.now() };
}

/** Lo que ve quien abre el enlace, con la hora de la consulta. Null si el enlace no existe. */
export async function viajeCompartido(token: string): Promise<{ viaje: ViajeCompartido; ahora: number } | null> {
  if (!tokenValido(token)) return null;
  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc("viaje_compartido", { p_token: token });
  const viaje = data?.[0];
  return viaje ? { viaje, ahora: Date.now() } : null;
}
