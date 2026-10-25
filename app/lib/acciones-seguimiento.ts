"use server";

import { crearClienteServidor } from "./supabase/server";
import { esquemaIdViaje, esquemaUbicacion } from "./validaciones-viaje";

// Server Actions del seguimiento en vivo (013): el conductor manda su
// ubicación y el estudiante pide el enlace para compartir el viaje. Quién
// puede hacer cada cosa lo decide la base (reportar_ubicacion, compartir_viaje).

const MENSAJE_GENERICO = "No pudimos completar la acción. Intenta de nuevo en un momento.";

function mensajeDeError(error: { code?: string; message: string }): string {
  return error.code === "P0001" ? error.message : MENSAJE_GENERICO;
}

/** Se llama cada 5 segundos desde el teléfono del conductor. No refresca la página. */
export async function reportarUbicacion(datos: {
  viaje: string;
  lat: number;
  lng: number;
  precision?: number;
}): Promise<{ ok: boolean; mensaje?: string }> {
  const validado = esquemaUbicacion.safeParse(datos);
  if (!validado.success) return { ok: false, mensaje: "La ubicación no es válida." };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("reportar_ubicacion", {
    p_viaje: validado.data.viaje,
    // Seis decimales son unos 10 cm: no hace falta más.
    p_lat: Number(validado.data.lat.toFixed(6)),
    p_lng: Number(validado.data.lng.toFixed(6)),
    p_precision: validado.data.precision === undefined ? undefined : Math.round(validado.data.precision),
  });
  if (error) return { ok: false, mensaje: mensajeDeError(error) };
  return { ok: true };
}

/** Devuelve el token del enlace del viaje (siempre el mismo para ese viaje). */
export async function compartirViaje(viajeId: string): Promise<{ token?: string; mensaje?: string }> {
  const validado = esquemaIdViaje.safeParse({ viaje: viajeId });
  if (!validado.success) return { mensaje: "Ese viaje no existe." };
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("compartir_viaje", { p_viaje: validado.data.viaje });
  if (error || !data) return { mensaje: error ? mensajeDeError(error) : MENSAJE_GENERICO };
  return { token: data };
}
