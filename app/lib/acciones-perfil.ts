"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoFormulario } from "./estado-formulario";
import { inicioDeRol } from "./sesion";
import { crearClienteServidor } from "./supabase/server";
import { datosDelFormulario, erroresPorCampo, esquemaContacto, esquemaRol } from "./validaciones-auth";

export async function actualizarContacto(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const datos = datosDelFormulario(formulario);
  const valores = { nombre: (datos.nombre ?? "").slice(0, 80), telefono: (datos.telefono ?? "").slice(0, 40) };
  const validado = esquemaContacto.safeParse(datos);
  if (!validado.success) return { resultado: "error", errores: erroresPorCampo(validado.error), valores };
  const supabase = await crearClienteServidor();
  try {
    const { error } = await supabase.rpc("actualizar_contacto", { p_nombre: validado.data.nombre, p_telefono: validado.data.telefono });
    if (error) return { resultado: "error", mensaje: "No pudimos guardar tus datos. Revisa tu conexión e inténtalo de nuevo.", valores };
  } catch { return { resultado: "error", mensaje: "No pudimos guardar tus datos. Revisa tu conexión e inténtalo de nuevo.", valores }; }
  revalidatePath("/", "layout");
  return { resultado: "listo", mensaje: "Tu nombre y celular quedaron actualizados.", valores: { nombre: validado.data.nombre, telefono: validado.data.telefono.replace(/^\+57/, "") } };
}

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
