"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { EstadoFormulario } from "./estado-formulario";
import { crearClienteServidor } from "./supabase/server";

// Server Actions del botón de emergencia (037). Avisar deja un reporte urgente
// para los administradores; la base revisa que el viaje o cupo esté activo y
// que quien avisa vaya en él. La llamada al 123 la hace el teléfono, no esto.

const MENSAJE_GENERICO = "No pudimos avisar al equipo. Llama al 123 si es urgente.";

const esquemaAviso = z
  .object({
    viaje: z.string().uuid().optional(),
    cupo: z.string().uuid().optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  })
  .refine((d) => Boolean(d.viaje) !== Boolean(d.cupo), "Indica el viaje o el cupo.")
  .refine((d) => (d.lat === undefined) === (d.lng === undefined), "Ubicación incompleta.");

export async function reportarEmergencia(datos: { viaje?: string; cupo?: string; lat?: number; lng?: number }): Promise<{ ok: boolean; mensaje?: string }> {
  const validado = esquemaAviso.safeParse(datos);
  if (!validado.success) return { ok: false, mensaje: MENSAJE_GENERICO };
  const { viaje, cupo, lat, lng } = validado.data;
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("reportar_emergencia", { p_viaje: viaje, p_cupo: cupo, p_lat: lat, p_lng: lng });
  if (error) return { ok: false, mensaje: error.code === "P0001" ? error.message : MENSAJE_GENERICO };
  return { ok: true };
}

const esquemaAtender = z.object({ emergencia: z.string().uuid() });

/** Un administrador marca el aviso como atendido. */
export async function atenderEmergencia(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const validado = esquemaAtender.safeParse({ emergencia: formulario.get("emergencia") });
  if (!validado.success) return { resultado: "error", mensaje: "Ese aviso no existe." };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("atender_emergencia", { p_emergencia: validado.data.emergencia });
  if (error) return { resultado: "error", mensaje: error.code === "P0001" ? error.message : "No pudimos marcarlo. Intenta de nuevo." };
  revalidatePath("/admin");
  return { resultado: "listo" };
}
