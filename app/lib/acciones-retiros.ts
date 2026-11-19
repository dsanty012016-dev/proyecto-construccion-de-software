"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { EstadoFormulario } from "./estado-formulario";
import { esquemaRetiro, esquemaRevisionRetiro } from "./retiros";
import { crearClienteServidor } from "./supabase/server";
import { datosDelFormulario, erroresPorCampo } from "./validaciones-auth";

export async function tomarRetiro(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const id = z.uuid().safeParse(formulario.get("retiro"));
  if (!id.success) return { resultado: "error", mensaje: "No pudimos identificar el retiro." };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("tomar_retiro", { p_retiro: id.data });
  if (error) return { resultado: "error", mensaje: error.code === "P0001" ? error.message : "No pudimos asignar el retiro." };
  revalidatePath("/admin");
  revalidatePath("/billetera/retiros");
  return { resultado: "listo", mensaje: "El retiro quedó asignado a tu cuenta." };
}

export async function solicitarRetiro(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const datos = datosDelFormulario(formulario);
  const validado = esquemaRetiro.safeParse(datos);
  if (!validado.success) return { resultado: "error", errores: erroresPorCampo(validado.error), valores: datos };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("solicitar_retiro", { p_monto: validado.data.monto, p_nequi: validado.data.nequi });
  if (error) return { resultado: "error", mensaje: error.code === "P0001" ? error.message : "No pudimos solicitar el retiro. Intenta de nuevo.", valores: datos };
  revalidatePath("/billetera");
  revalidatePath("/admin");
  redirect("/billetera/retiros?solicitado=1");
}

export async function revisarRetiro(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const validado = esquemaRevisionRetiro.safeParse(datosDelFormulario(formulario));
  if (!validado.success) return { resultado: "error", errores: erroresPorCampo(validado.error) };
  const datos = validado.data;
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("revisar_retiro", {
    p_retiro: datos.retiro, p_pagado: datos.resultado === "pagado",
    p_documentacion_verificada: datos.documentos === "on", p_referencia: datos.referencia || undefined, p_motivo: datos.motivo || undefined,
  });
  if (error) return { resultado: "error", mensaje: error.code === "P0001" ? error.message : "No pudimos registrar la revisión. Intenta de nuevo." };
  revalidatePath("/admin");
  revalidatePath("/billetera");
  revalidatePath("/billetera/retiros");
  return { resultado: "listo", mensaje: datos.resultado === "pagado" ? "Pago registrado." : "Retiro rechazado y dinero devuelto a la billetera." };
}
