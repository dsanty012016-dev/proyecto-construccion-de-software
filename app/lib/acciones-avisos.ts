"use server";

import { datosDeSuscripcion } from "./avisos";
import { crearClienteServidor } from "./supabase/server";

// Server Actions de las notificaciones (fase 12): guardar o borrar la
// suscripción de este celular. La base (019) solo deja tocar las propias.

type Resultado = { ok: true } | { ok: false; mensaje: string };

const MENSAJE_GENERICO = "No pudimos cambiar las notificaciones. Intenta de nuevo.";

export async function activarNotificaciones(suscripcion: { endpoint?: string; keys?: Record<string, string> }): Promise<Resultado> {
  const datos = datosDeSuscripcion(suscripcion);
  if (!datos) return { ok: false, mensaje: "Este navegador no dio una suscripción válida." };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("guardar_suscripcion", { p_endpoint: datos.endpoint, p_p256dh: datos.p256dh, p_auth: datos.auth });
  if (error) return { ok: false, mensaje: error.code === "P0001" ? error.message : MENSAJE_GENERICO };
  return { ok: true };
}

export async function desactivarNotificaciones(endpoint: string): Promise<Resultado> {
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || endpoint.length > 1000) return { ok: false, mensaje: MENSAJE_GENERICO };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("borrar_suscripcion", { p_endpoint: endpoint });
  if (error) return { ok: false, mensaje: MENSAJE_GENERICO };
  return { ok: true };
}
