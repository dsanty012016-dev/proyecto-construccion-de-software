"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoFormulario } from "./estado-formulario";
import { redondear } from "./mapa";
import { crearClienteServidor } from "./supabase/server";
import { datosDelFormulario, erroresPorCampo } from "./validaciones-auth";
import { esquemaIdCupo, esquemaPedirPuesto, esquemaPublicarCupo, esquemaResponderPuesto } from "./validaciones-cupo";
import { esquemaCalificacionPuesto, textoDeRecogida } from "./validaciones-viaje";

// Server Actions de los cupos publicados por el conductor. Cada una valida con
// Zod y llama a la función de la base (010-cupos.sql), que es la que hace
// cumplir las reglas. Los mensajes de las reglas ya vienen en español.

const MENSAJE_GENERICO = "No pudimos completar la acción. Intenta de nuevo en un momento.";
const LISTO: EstadoFormulario = { resultado: "listo" };

function mensajeDeError(error: { code?: string; message: string }): string {
  return error.code === "P0001" ? error.message : MENSAJE_GENERICO;
}

function falla(mensaje: string, valores?: Record<string, string>): EstadoFormulario {
  return { resultado: "error", mensaje, valores };
}

function refrescar() {
  revalidatePath("/", "layout");
}

export async function publicarCupo(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const datos = datosDelFormulario(formulario);
  const validado = esquemaPublicarCupo.safeParse(datos);
  if (!validado.success) {
    return { resultado: "error", errores: erroresPorCampo(validado.error), valores: datos };
  }
  const salida = redondear({ lat: validado.data.salida_lat, lng: validado.data.salida_lng });

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("publicar_cupo", {
    p_salida_lat: salida.lat,
    p_salida_lng: salida.lng,
    p_salida_texto: validado.data.direccion,
    p_sale_en: validado.data.sale_en,
    p_puestos: validado.data.puestos,
    p_precio: validado.data.precio,
  });
  if (error) return falla(mensajeDeError(error), datos);

  refrescar();
  redirect("/conductor/cupo");
}

export async function pedirPuesto(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const datos = datosDelFormulario(formulario);
  const validado = esquemaPedirPuesto.safeParse(datos);
  if (!validado.success) {
    return { resultado: "error", errores: erroresPorCampo(validado.error), valores: datos };
  }
  const recogida = redondear({ lat: validado.data.recogida_lat, lng: validado.data.recogida_lng });

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("pedir_puesto", {
    p_cupo: validado.data.cupo,
    p_recogida_lat: recogida.lat,
    p_recogida_lng: recogida.lng,
    p_recogida_texto: textoDeRecogida(validado.data),
  });
  if (error) return falla(mensajeDeError(error), datos);

  refrescar();
  return LISTO;
}

export async function responderPuesto(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const validado = esquemaResponderPuesto.safeParse(datosDelFormulario(formulario));
  if (!validado.success) return falla("Esa solicitud no existe.");

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("responder_puesto", {
    p_puesto: validado.data.puesto,
    p_aprobar: validado.data.decision === "aprobar",
  });
  if (error) return falla(mensajeDeError(error));

  refrescar();
  return LISTO;
}

/** Acciones con solo el id del cupo: retirar mi puesto, iniciar, terminar o cancelar el cupo. */
async function accionSobreCupo(
  formulario: FormData,
  funcion: "retirar_puesto" | "iniciar_cupo" | "terminar_cupo" | "cancelar_cupo" | "pagar_puesto",
): Promise<{ error: string | null; cupo: string | null }> {
  const validado = esquemaIdCupo.safeParse(datosDelFormulario(formulario));
  if (!validado.success) return { error: "Ese cupo no existe.", cupo: null };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc(funcion, { p_cupo: validado.data.cupo });
  if (error) return { error: mensajeDeError(error), cupo: null };
  refrescar();
  return { error: null, cupo: validado.data.cupo };
}

export async function pagarPuesto(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const { error } = await accionSobreCupo(formulario, "pagar_puesto");
  return error ? falla(error) : { resultado: "listo", mensaje: "Puesto pagado." };
}

export async function retirarPuesto(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const { error } = await accionSobreCupo(formulario, "retirar_puesto");
  return error ? falla(error) : LISTO;
}

export async function iniciarCupo(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const { error } = await accionSobreCupo(formulario, "iniciar_cupo");
  return error ? falla(error) : LISTO;
}

export async function terminarCupo(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const { error, cupo } = await accionSobreCupo(formulario, "terminar_cupo");
  if (error) return falla(error);
  // Al llegar, el conductor califica a cada estudiante que llevó (014).
  redirect(`/viajes/cupo/${cupo}/calificar`);
}

export async function cancelarCupo(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const { error } = await accionSobreCupo(formulario, "cancelar_cupo");
  if (error) return falla(error);
  redirect("/conductor");
}

/** Califica a la otra persona de un puesto de un cupo terminado (014). */
export async function calificarPuesto(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const datos = datosDelFormulario(formulario);
  const validado = esquemaCalificacionPuesto.safeParse(datos);
  if (!validado.success) {
    return { resultado: "error", errores: erroresPorCampo(validado.error), valores: datos };
  }
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("calificar_puesto", {
    p_puesto: validado.data.puesto,
    p_estrellas: validado.data.estrellas,
    p_comentario: validado.data.comentario,
  });
  if (error) return falla(mensajeDeError(error), datos);

  refrescar();
  // Vuelve a la misma pantalla: si quedan estudiantes por calificar, siguen ahí.
  redirect(`/viajes/cupo/${validado.data.cupo}/calificar`);
}
