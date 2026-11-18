"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { EstadoFormulario } from "./estado-formulario";
import { crearClienteServidor } from "./supabase/server";
import { erroresPorCampo } from "./validaciones-auth";

const esquema = z.object({
  incidencia: z.uuid("No pudimos identificar la incidencia."),
  verificada: z.literal("on", { error: "Confirma la comparación con Wompi y UniGo." }),
  nota: z.string().trim().min(3, "Escribe el resultado de la revisión.").max(500, "Usa hasta 500 caracteres."),
});

export async function cerrarIncidencia(_previo: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const resultado = esquema.safeParse({
    incidencia: formulario.get("incidencia"), verificada: formulario.get("verificada"), nota: formulario.get("nota"),
  });
  if (!resultado.success) return { resultado: "error", errores: erroresPorCampo(resultado.error) };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("cerrar_incidencia_pago", {
    p_incidencia: resultado.data.incidencia, p_verificada: true, p_nota: resultado.data.nota,
  });
  if (error) return {
    resultado: "error",
    mensaje: error.code === "P0001" ? error.message : "No pudimos cerrar la incidencia. Intenta de nuevo.",
  };
  revalidatePath("/admin");
  return { resultado: "listo", mensaje: "Revisión guardada." };
}
