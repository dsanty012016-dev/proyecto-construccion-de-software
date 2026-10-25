"use server";

import { crearClienteServidor } from "./supabase/server";
import { esquemaIdViaje, esquemaUbicacion } from "./validaciones-viaje";
import { esquemaIdCupo } from "./validaciones-cupo";

// Server Actions del seguimiento en vivo (013 y 014): el conductor manda su
// ubicación (en un viaje o en un cupo en curso) y el estudiante pide el enlace
// para compartir su viaje. Quién puede hacer cada cosa lo decide la base.
// Las pantallas reciben estas acciones ya atadas a su viaje o cupo (.bind).

const MENSAJE_GENERICO = "No pudimos completar la acción. Intenta de nuevo en un momento.";

function mensajeDeError(error: { code?: string; message: string }): string {
  return error.code === "P0001" ? error.message : MENSAJE_GENERICO;
}

export interface Posicion {
  lat: number;
  lng: number;
  precision?: number;
}

type Respuesta = { ok: boolean; mensaje?: string };

/** Valida la posición y la deja lista para la base (seis decimales son unos 10 cm). */
function limpiar(id: string, posicion: Posicion) {
  const validado = esquemaUbicacion.safeParse({ viaje: id, ...posicion });
  if (!validado.success) return null;
  return {
    lat: Number(validado.data.lat.toFixed(6)),
    lng: Number(validado.data.lng.toFixed(6)),
    precision: validado.data.precision === undefined ? undefined : Math.round(validado.data.precision),
  };
}

/** Se llama cada 5 segundos desde el teléfono del conductor. No refresca la página. */
export async function reportarUbicacion(viajeId: string, posicion: Posicion): Promise<Respuesta> {
  const datos = limpiar(viajeId, posicion);
  if (!datos) return { ok: false, mensaje: "La ubicación no es válida." };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("reportar_ubicacion", { p_viaje: viajeId, p_lat: datos.lat, p_lng: datos.lng, p_precision: datos.precision });
  return error ? { ok: false, mensaje: mensajeDeError(error) } : { ok: true };
}

/** Lo mismo, para un cupo en curso. */
export async function reportarUbicacionCupo(cupoId: string, posicion: Posicion): Promise<Respuesta> {
  const datos = limpiar(cupoId, posicion);
  if (!datos) return { ok: false, mensaje: "La ubicación no es válida." };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("reportar_ubicacion_cupo", { p_cupo: cupoId, p_lat: datos.lat, p_lng: datos.lng, p_precision: datos.precision });
  return error ? { ok: false, mensaje: mensajeDeError(error) } : { ok: true };
}

/** Token del enlace del viaje (siempre el mismo para ese viaje). */
export async function compartirViaje(viajeId: string): Promise<{ token?: string; mensaje?: string }> {
  const validado = esquemaIdViaje.safeParse({ viaje: viajeId });
  if (!validado.success) return { mensaje: "Ese viaje no existe." };
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("compartir_viaje", { p_viaje: validado.data.viaje });
  if (error || !data) return { mensaje: error ? mensajeDeError(error) : MENSAJE_GENERICO };
  return { token: data };
}

/** Token del enlace del puesto del estudiante en un cupo. */
export async function compartirPuesto(cupoId: string): Promise<{ token?: string; mensaje?: string }> {
  const validado = esquemaIdCupo.safeParse({ cupo: cupoId });
  if (!validado.success) return { mensaje: "Ese cupo no existe." };
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("compartir_puesto", { p_cupo: validado.data.cupo });
  if (error || !data) return { mensaje: error ? mensajeDeError(error) : MENSAJE_GENERICO };
  return { token: data };
}
