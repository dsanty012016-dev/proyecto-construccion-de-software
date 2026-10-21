"use server";

import { revalidatePath } from "next/cache";
import type { EstadoFormulario } from "./estado-formulario";
import { pesos } from "./formato";
import { RECARGA_MAXIMA, RECARGA_MINIMA } from "./pagos";
import { crearClienteServidor } from "./supabase/server";
import { datosDelFormulario } from "./validaciones-auth";

// Recarga de saldo de prueba (billetera simulada). Los topes los hace cumplir
// la función recargar de la base (012-billetera.sql).
export async function recargar(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const datos = datosDelFormulario(formulario);
  const monto = Number((datos.monto ?? "").replace(/\D/g, ""));
  if (!Number.isInteger(monto) || monto < RECARGA_MINIMA || monto > RECARGA_MAXIMA) {
    return { resultado: "error", errores: { monto: `La recarga debe ser entre ${pesos(RECARGA_MINIMA)} y ${pesos(RECARGA_MAXIMA)}.` }, valores: datos };
  }
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("recargar", { p_monto: monto });
  if (error) {
    return {
      resultado: "error",
      mensaje: error.code === "P0001" ? error.message : "No pudimos recargar. Intenta de nuevo en un momento.",
      valores: datos,
    };
  }
  revalidatePath("/", "layout");
  return { resultado: "listo", mensaje: `Recargaste ${pesos(monto)}.` };
}
