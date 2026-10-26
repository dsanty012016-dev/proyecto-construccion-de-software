import { z } from "zod";
import { horaLocalAIso, PUESTOS_MAXIMOS_CARRO } from "./cupo";
import { pesos } from "./formato";
import { coordenadaOpcional, esquemaSentido } from "./validaciones-viaje";
import { PRECIO_MAXIMO, PRECIO_MINIMO } from "./viaje";

// Validación de los formularios de cupos. Corre en el servidor antes de llamar
// a Supabase; la base vuelve a revisar todo en 010-cupos.sql.

function numeroDeTexto(mensaje: string) {
  return z
    .string({ required_error: mensaje })
    .trim()
    .min(1, mensaje)
    .transform((valor) => Number(valor.replace(",", ".")))
    .refine((valor) => Number.isFinite(valor), mensaje);
}

const latitud = (mensaje: string) => numeroDeTexto(mensaje).refine((v) => v >= -90 && v <= 90, "Esa ubicación no es válida.");
const longitud = (mensaje: string) => numeroDeTexto(mensaje).refine((v) => v >= -180 && v <= 180, "Esa ubicación no es válida.");

const direccion = z
  .string({ required_error: "Escribe la dirección o el barrio." })
  .trim()
  .min(3, "Escribe la dirección o el barrio.")
  .max(120, "Máximo 120 caracteres.");

const referencia = z
  .string()
  .trim()
  .max(70, "Máximo 70 caracteres.")
  .optional()
  .transform((valor) => valor || undefined);

const idCupo = z.string({ required_error: "Falta el cupo." }).uuid("Ese cupo no existe.");

/**
 * Publicar cupo (017). "punto" es el del conductor: de donde sale en la ida o
 * hasta donde va en el regreso. "u" es la salida en la U (regreso); si no
 * viene, es la sede.
 */
export const esquemaPublicarCupo = z.object({
  sentido: esquemaSentido,
  punto_lat: latitud("Elige tu punto en el mapa."),
  punto_lng: longitud("Elige tu punto en el mapa."),
  direccion,
  u_lat: coordenadaOpcional(90),
  u_lng: coordenadaOpcional(180),
  referencia_u: referencia,
  sale_en: z
    .string({ required_error: "Elige la fecha y la hora de salida." })
    .transform((valor, ctx) => {
      const iso = horaLocalAIso(valor);
      if (!iso) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Elige la fecha y la hora de salida." });
        return z.NEVER;
      }
      return iso;
    }),
  puestos: numeroDeTexto("Elige cuántos puestos ofreces.").refine(
    (v) => Number.isInteger(v) && v >= 1 && v <= PUESTOS_MAXIMOS_CARRO,
    `Puedes ofrecer de 1 a ${PUESTOS_MAXIMOS_CARRO} puestos.`,
  ),
  precio: numeroDeTexto("Escribe el precio por puesto.")
    .refine((v) => Number.isInteger(v), "El precio debe ser en pesos enteros.")
    .refine((v) => v >= PRECIO_MINIMO && v <= PRECIO_MAXIMO, `El precio debe estar entre ${pesos(PRECIO_MINIMO)} y ${pesos(PRECIO_MAXIMO)}.`),
});

export const esquemaPedirPuesto = z.object({
  cupo: idCupo,
  recogida_lat: latitud("Elige tu punto en el mapa."),
  recogida_lng: longitud("Elige tu punto en el mapa."),
  direccion,
  referencia,
});

export const esquemaResponderPuesto = z.object({
  puesto: z.string({ required_error: "Falta la solicitud." }).uuid("Esa solicitud no existe."),
  decision: z.enum(["aprobar", "rechazar"]),
});

export const esquemaIdCupo = z.object({ cupo: idCupo });
