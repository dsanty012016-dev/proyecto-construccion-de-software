"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoFormulario } from "./estado-formulario";
import { pesos } from "./formato";
import { RECARGA_MAXIMA, RECARGA_MINIMA } from "./pagos";
import { origenDelSitio, pasarela } from "./pasarela";
import { crearClienteServidor } from "./supabase/server";
import { datosDelFormulario } from "./validaciones-auth";
import { urlDeCheckout } from "./wompi";

/** Lee el monto del formulario; devuelve el error para mostrar si no sirve. */
function leerMonto(datos: Record<string, string>): { monto: number } | { error: EstadoFormulario } {
  const monto = Number((datos.monto ?? "").replace(/\D/g, ""));
  if (!Number.isInteger(monto) || monto < RECARGA_MINIMA || monto > RECARGA_MAXIMA) {
    return {
      error: { resultado: "error", errores: { monto: `La recarga debe ser entre ${pesos(RECARGA_MINIMA)} y ${pesos(RECARGA_MAXIMA)}.` }, valores: datos },
    };
  }
  return { monto };
}

// Recarga de saldo de prueba (billetera simulada), para cuando no hay
// pasarela configurada. Los topes los hace cumplir la función recargar de la
// base (012-billetera.sql) y se apaga desde allá (023-pasarela.sql).
export async function recargar(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const datos = datosDelFormulario(formulario);
  const leido = leerMonto(datos);
  if ("error" in leido) return leido.error;
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("recargar", { p_monto: leido.monto });
  if (error) {
    return {
      resultado: "error",
      mensaje: error.code === "P0001" ? error.message : "No pudimos recargar. Intenta de nuevo en un momento.",
      valores: datos,
    };
  }
  revalidatePath("/", "layout");
  return { resultado: "listo", mensaje: `Recargaste ${pesos(leido.monto)}.` };
}

// Recarga con dinero de verdad (o de pruebas de Wompi): abre la recarga en la
// base (iniciar_recarga, 023) y manda a la persona a pagar a la página de
// Wompi. El saldo NO se da aquí: llega cuando Wompi avisa que el pago se
// aprobó (app/api/v1/pagos/wompi).
export async function iniciarRecarga(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const datos = datosDelFormulario(formulario);
  const leido = leerMonto(datos);
  if ("error" in leido) return leido.error;
  const configurada = pasarela();
  if (!configurada) {
    return { resultado: "error", mensaje: "Los pagos no están disponibles en este momento. Intenta más tarde.", valores: datos };
  }
  const supabase = await crearClienteServidor();
  const { data: referencia, error } = await supabase.rpc("iniciar_recarga", { p_monto: leido.monto });
  if (error || !referencia) {
    return {
      resultado: "error",
      mensaje: error?.code === "P0001" ? error.message : "No pudimos abrir la recarga. Intenta de nuevo en un momento.",
      valores: datos,
    };
  }
  // redirect lanza una señal que Next atrapa: por eso va fuera de cualquier try.
  redirect(
    urlDeCheckout({
      llavePublica: configurada.llavePublica,
      secretoIntegridad: configurada.secretoIntegridad,
      referencia,
      monto: leido.monto,
      volverA: `${await origenDelSitio()}/billetera/recarga/${referencia}`,
    }),
  );
}
