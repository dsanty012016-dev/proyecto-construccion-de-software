"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TIPOS_DOCUMENTO } from "./documentos";
import type { EstadoFormulario } from "./estado-formulario";
import { crearClienteServidor } from "./supabase/server";
import { datosDelFormulario } from "./validaciones-auth";

// Server Actions de la verificación del conductor. El archivo ya lo subió el
// navegador al bucket privado; aquí se registra (enviar_documento) o se revisa
// (revisar_documento, solo administradores). Las reglas están en 011.

const MENSAJE_GENERICO = "No pudimos completar la acción. Intenta de nuevo en un momento.";

function mensajeDeError(error: { code?: string; message: string }): string {
  return error.code === "P0001" ? error.message : MENSAJE_GENERICO;
}

const esquemaEnviar = z.object({
  tipo: z.enum(TIPOS_DOCUMENTO),
  ruta: z.string().regex(/^[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,100}$/, "Ese archivo no es válido."),
  autorizo: z.literal("si", { errorMap: () => ({ message: "Debes autorizar el tratamiento de tus datos para continuar." }) }),
});

export async function enviarDocumento(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const validado = esquemaEnviar.safeParse(datosDelFormulario(formulario));
  if (!validado.success) return { resultado: "error", mensaje: validado.error.issues[0]?.message ?? MENSAJE_GENERICO };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("enviar_documento", {
    p_tipo: validado.data.tipo,
    p_ruta: validado.data.ruta,
    p_autorizo: true,
  });
  if (error) return { resultado: "error", mensaje: mensajeDeError(error) };

  revalidatePath("/", "layout");
  return { resultado: "listo", mensaje: "Documento enviado. Te avisamos cuando lo revisen." };
}

const esquemaRevisar = z.object({
  documento: z.string().uuid("Ese documento no existe."),
  decision: z.enum(["aprobar", "rechazar"]),
  motivo: z.string().trim().max(300, "El motivo puede tener hasta 300 caracteres.").optional(),
});

export async function revisarDocumento(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const validado = esquemaRevisar.safeParse(datosDelFormulario(formulario));
  if (!validado.success) return { resultado: "error", mensaje: validado.error.issues[0]?.message ?? MENSAJE_GENERICO };
  const { documento, decision, motivo } = validado.data;
  if (decision === "rechazar" && !motivo) return { resultado: "error", mensaje: "Escribe el motivo del rechazo." };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("revisar_documento", {
    p_documento: documento,
    p_aprobar: decision === "aprobar",
    p_motivo: motivo || undefined,
  });
  if (error) return { resultado: "error", mensaje: mensajeDeError(error) };

  revalidatePath("/", "layout");
  return { resultado: "listo" };
}
