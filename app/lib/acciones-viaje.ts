"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoFormulario } from "./estado-formulario";
import { crearClienteServidor } from "./supabase/server";
import { datosDelFormulario, erroresPorCampo } from "./validaciones-auth";
import {
  esquemaAceptarOferta,
  esquemaCalificacion,
  esquemaDisponibilidad,
  esquemaIdViaje,
  esquemaOferta,
  esquemaPedirViaje,
  esquemaVehiculo,
  textoDeRecogida,
} from "./validaciones-viaje";

// Server Actions del viaje. Cada una valida con Zod, llama a la función RPC de
// Supabase que de verdad hace cumplir la regla (004 y 005) y devuelve un estado
// para mostrar. Los mensajes de las reglas ya vienen en español desde la base.

const MENSAJE_GENERICO = "No pudimos completar la acción. Intenta de nuevo en un momento.";
const LISTO: EstadoFormulario = { resultado: "listo" };

/** Un error de una regla de la base (raise exception) se muestra tal cual; el resto, genérico. */
function mensajeDeError(error: { code?: string; message: string }): string {
  return error.code === "P0001" ? error.message : MENSAJE_GENERICO;
}

function falla(mensaje: string): EstadoFormulario {
  return { resultado: "error", mensaje };
}

async function conSesion() {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getUser();
  return { supabase, usuario: data.user };
}

function refrescar() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Estudiante
// ---------------------------------------------------------------------------

export async function pedirViaje(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const datos = datosDelFormulario(formulario);
  const validado = esquemaPedirViaje.safeParse(datos);
  if (!validado.success) {
    return { resultado: "error", errores: erroresPorCampo(validado.error), valores: datos };
  }

  const { supabase, usuario } = await conSesion();
  if (!usuario) return falla("Inicia sesión primero.");

  // El destino es la sede de la universidad de la persona (por ahora siempre la misma).
  const { data: perfil } = await supabase.from("perfiles").select("universidad_id").eq("id", usuario.id).single();
  const { data: sede } = perfil
    ? await supabase.from("universidades").select("nombre, lat, lng").eq("id", perfil.universidad_id).single()
    : { data: null };
  if (!sede || sede.lat === null || sede.lng === null) {
    return { ...falla("Tu universidad todavía no tiene la ubicación de la sede configurada. Avísale al equipo."), valores: datos };
  }

  const { error } = await supabase.rpc("solicitar_viaje", {
    p_origen_lat: validado.data.origen_lat,
    p_origen_lng: validado.data.origen_lng,
    p_origen_texto: textoDeRecogida(validado.data),
    p_destino_lat: sede.lat,
    p_destino_lng: sede.lng,
    p_destino_texto: sede.nombre,
  });
  if (error) return { ...falla(mensajeDeError(error)), valores: datos };

  refrescar();
  redirect("/estudiante/viaje");
}

export async function aceptarOferta(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const validado = esquemaAceptarOferta.safeParse(datosDelFormulario(formulario));
  if (!validado.success) return falla("Esa oferta no existe.");

  const { supabase, usuario } = await conSesion();
  if (!usuario) return falla("Inicia sesión primero.");
  const { error } = await supabase.rpc("aceptar_oferta", { p_oferta: validado.data.oferta });
  if (error) return falla(mensajeDeError(error));

  refrescar();
  return LISTO;
}

// ---------------------------------------------------------------------------
// Conductor
// ---------------------------------------------------------------------------

export async function cambiarDisponibilidad(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const validado = esquemaDisponibilidad.safeParse(datosDelFormulario(formulario));
  if (!validado.success) return falla(MENSAJE_GENERICO);

  const { supabase, usuario } = await conSesion();
  if (!usuario) return falla("Inicia sesión primero.");
  const { error } = await supabase.rpc("cambiar_disponibilidad", { p_disponible: validado.data.disponible === "si" });
  if (error) return falla(mensajeDeError(error));

  refrescar();
  return LISTO;
}

export async function ofertarViaje(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const datos = datosDelFormulario(formulario);
  const validado = esquemaOferta.safeParse(datos);
  if (!validado.success) {
    return { resultado: "error", errores: erroresPorCampo(validado.error), valores: datos };
  }

  const { supabase, usuario } = await conSesion();
  if (!usuario) return falla("Inicia sesión primero.");
  const { error } = await supabase.rpc("ofertar", { p_viaje: validado.data.viaje, p_precio: validado.data.precio });
  if (error) return { ...falla(mensajeDeError(error)), valores: datos };

  refrescar();
  redirect("/conductor");
}

export async function retirarOferta(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const validado = esquemaIdViaje.safeParse(datosDelFormulario(formulario));
  if (!validado.success) return falla("Ese viaje no existe.");

  const { supabase, usuario } = await conSesion();
  if (!usuario) return falla("Inicia sesión primero.");
  const { error } = await supabase.rpc("retirar_oferta", { p_viaje: validado.data.viaje });
  if (error) return falla(mensajeDeError(error));

  refrescar();
  return LISTO;
}

export async function iniciarViaje(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const validado = esquemaIdViaje.safeParse(datosDelFormulario(formulario));
  if (!validado.success) return falla("Ese viaje no existe.");

  const { supabase, usuario } = await conSesion();
  if (!usuario) return falla("Inicia sesión primero.");
  const { error } = await supabase.rpc("iniciar_viaje", { p_viaje: validado.data.viaje });
  if (error) return falla(mensajeDeError(error));

  refrescar();
  return LISTO;
}

export async function terminarViaje(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const validado = esquemaIdViaje.safeParse(datosDelFormulario(formulario));
  if (!validado.success) return falla("Ese viaje no existe.");

  const { supabase, usuario } = await conSesion();
  if (!usuario) return falla("Inicia sesión primero.");
  const { error } = await supabase.rpc("terminar_viaje", { p_viaje: validado.data.viaje });
  if (error) return falla(mensajeDeError(error));

  refrescar();
  redirect(`/viajes/${validado.data.viaje}/calificar`);
}

export async function guardarVehiculo(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const datos = datosDelFormulario(formulario);
  const validado = esquemaVehiculo.safeParse(datos);
  if (!validado.success) {
    return { resultado: "error", errores: erroresPorCampo(validado.error), valores: datos };
  }

  const { supabase, usuario } = await conSesion();
  if (!usuario) return falla("Inicia sesión primero.");

  // Un vehículo por conductor: se crea o se actualiza. No se usa upsert porque
  // la base solo deja cambiar placa, marca, modelo y color (nunca el dueño),
  // y el upsert intentaría actualizar también conductor_id (003-vehiculos.sql).
  const { data: existente } = await supabase.from("vehiculos").select("id").eq("conductor_id", usuario.id).maybeSingle();
  const { error } = existente
    ? await supabase.from("vehiculos").update(validado.data).eq("id", existente.id)
    : await supabase.from("vehiculos").insert({ conductor_id: usuario.id, ...validado.data });
  if (error) {
    if (error.code === "23505") {
      return { resultado: "error", errores: { placa: "Esa placa ya está registrada." }, valores: datos };
    }
    return { ...falla(MENSAJE_GENERICO), valores: datos };
  }

  refrescar();
  return { resultado: "listo", mensaje: "Vehículo guardado." };
}

// ---------------------------------------------------------------------------
// Los dos
// ---------------------------------------------------------------------------

/** Cancelar vale para ambos roles; después cada uno vuelve a su inicio. */
export async function cancelarViaje(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const datos = datosDelFormulario(formulario);
  const validado = esquemaIdViaje.safeParse(datos);
  if (!validado.success) return falla("Ese viaje no existe.");
  // Si el estudiante cancela reportando al conductor, no paga ni recibe strike (012).
  const justificacion = (datos.justificacion ?? "").trim().slice(0, 300) || undefined;

  const { supabase, usuario } = await conSesion();
  if (!usuario) return falla("Inicia sesión primero.");
  const { error } = await supabase.rpc("cancelar_viaje", { p_viaje: validado.data.viaje, p_justificacion: justificacion });
  if (error) return falla(mensajeDeError(error));

  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", usuario.id).single();
  refrescar();
  redirect(perfil?.rol === "conductor" ? "/conductor" : "/estudiante");
}

export async function calificarViaje(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const datos = datosDelFormulario(formulario);
  const validado = esquemaCalificacion.safeParse(datos);
  if (!validado.success) {
    return { resultado: "error", errores: erroresPorCampo(validado.error), valores: datos };
  }

  const { supabase, usuario } = await conSesion();
  if (!usuario) return falla("Inicia sesión primero.");
  const { error } = await supabase.rpc("calificar", {
    p_viaje: validado.data.viaje,
    p_estrellas: validado.data.estrellas,
    p_comentario: validado.data.comentario,
  });
  if (error) return { ...falla(mensajeDeError(error)), valores: datos };

  refrescar();
  redirect("/viajes");
}
