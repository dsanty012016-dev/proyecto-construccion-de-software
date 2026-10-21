"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoFormulario } from "./estado-formulario";
import { inicioDeRol } from "./sesion";
import { crearClienteServidor } from "./supabase/server";
import { datosDelFormulario, esquemaRol } from "./validaciones-auth";

// Cambiar de modo (estudiante ↔ conductor) con la misma cuenta. La regla
// (no cambiar con un viaje en marcha, retirar ofertas) la hace cumplir la
// función cambiar_modo de la base (009-cambio-de-modo.sql).
export async function cambiarModo(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const validado = esquemaRol.safeParse(datosDelFormulario(formulario));
  if (!validado.success) return { resultado: "error", mensaje: "Elige estudiante o conductor." };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("cambiar_modo", { p_modo: validado.data.rol });
  if (error) {
    return {
      resultado: "error",
      mensaje: error.code === "P0001" ? error.message : "No pudimos cambiar de modo. Intenta de nuevo en un momento.",
    };
  }

  revalidatePath("/", "layout");
  redirect(inicioDeRol(validado.data.rol));
}
