"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { EstadoFormulario } from "./estado-formulario";
import { crearClienteServidor } from "./supabase/server";
import { datosDelFormulario, erroresPorCampo } from "./validaciones-auth";

const esquema = z.object({
  incidencia: z.uuid("No pudimos identificar la incidencia."),
  verificada: z.literal("on", { error: "Confirma la comparación con Wompi y UniGo." }),
  nota: z.string().trim().min(3, "Escribe el resultado de la revisión.").max(500, "Usa hasta 500 caracteres."),
  resultado: z.enum(["sin_ajuste", "devolucion_externa"], { error: "Selecciona el resultado de la conciliación." }),
  monto: z.string().optional(),
  comprobante: z.string().trim().optional(),
}).superRefine((datos, contexto) => {
  if (datos.resultado !== "devolucion_externa") return;
  if (!datos.monto || !/^\d+$/.test(datos.monto) || Number(datos.monto) < 1 || Number(datos.monto) > 2_147_483_647) {
    contexto.addIssue({ code: "custom", path: ["monto"], message: "Indica el monto devuelto en pesos, sin puntos ni decimales." });
  }
  if (!datos.comprobante || datos.comprobante.length < 3 || datos.comprobante.length > 100) {
    contexto.addIssue({ code: "custom", path: ["comprobante"], message: "Registra la referencia del comprobante de devolución." });
  }
});

export async function cerrarIncidencia(_previo: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  const resultado = esquema.safeParse(datosDelFormulario(formulario));
  if (!resultado.success) return { resultado: "error", errores: erroresPorCampo(resultado.error) };
  const supabase = await crearClienteServidor();
  const datos = resultado.data;
  const devolucion = datos.resultado === "devolucion_externa";
  const { error } = await supabase.rpc("resolver_incidencia_pago", {
    p_incidencia: datos.incidencia, p_verificada: true, p_nota: datos.nota, p_resultado: datos.resultado,
    ...(devolucion && { p_monto: Number(datos.monto), p_comprobante: datos.comprobante }),
  });
  if (error) return {
    resultado: "error",
    mensaje: error.code === "P0001" ? error.message : "No pudimos cerrar la incidencia. Intenta de nuevo.",
  };
  revalidatePath("/admin");
  revalidatePath("/billetera");
  revalidatePath("/billetera/recargas");
  revalidatePath("/billetera/recarga/[referencia]", "page");
  return { resultado: "listo", mensaje: "Revisión guardada." };
}
