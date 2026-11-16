import { z } from "zod";
import { SALDO_MAXIMO } from "./pagos";

export const RETIRO_MINIMO = 20_000;
export const DIAS_PLAZO_RETIRO = 7;
export const esquemaRetiro = z.object({
  monto: z.string().regex(/^\d+$/, "Escribe el monto en pesos enteros.").transform(Number)
    .refine((monto) => Number.isSafeInteger(monto) && monto >= RETIRO_MINIMO && monto <= SALDO_MAXIMO,
      "El retiro debe ser desde $20.000 y no puede superar tus ganancias disponibles."),
  nequi: z.string().transform((valor) => valor.replace(/[\s()-]/g, "").replace(/^\+?57(?=\d{10}$)/, ""))
    .refine((valor) => /^3\d{9}$/.test(valor), "El número de Nequi debe tener 10 dígitos y empezar por 3."),
});
export const esquemaRevisionRetiro = z.object({
  retiro: z.string().uuid("Ese retiro no existe."),
  resultado: z.enum(["pagado", "rechazado"]),
  documentos: z.string().optional(),
  referencia: z.string().trim().max(100, "Máximo 100 caracteres.").optional(),
  motivo: z.string().trim().max(300, "Máximo 300 caracteres.").optional(),
}).superRefine((datos, contexto) => {
  if (datos.resultado === "pagado") {
    if (datos.documentos !== "on") contexto.addIssue({ code: "custom", path: ["documentos"], message: "Confirma que revisaste la cédula y la titularidad del Nequi." });
    if (!datos.referencia || datos.referencia.length < 6) contexto.addIssue({ code: "custom", path: ["referencia"], message: "Escribe la referencia del pago ya realizado." });
  } else if (!datos.motivo || datos.motivo.length < 3) {
    contexto.addIssue({ code: "custom", path: ["motivo"], message: "Explica por qué no se aprobó el retiro." });
  }
});

export function paginaValida(valor: string | undefined): number {
  if (!valor || !/^\d{1,6}$/.test(valor)) return 1;
  return Math.max(1, Number(valor));
}
