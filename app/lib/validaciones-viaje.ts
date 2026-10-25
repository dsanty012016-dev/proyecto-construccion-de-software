import { z } from "zod";
import { pesos } from "./formato";
import { PRECIO_MAXIMO, PRECIO_MINIMO } from "./viaje";

// Validación de los formularios del viaje (pedir, ofertar, calificar,
// registrar vehículo). Corre en el servidor antes de llamar a Supabase; la base
// de datos vuelve a revisar todo en sus funciones (004 y 005).

const LARGO_DIRECCION = 120;
const LARGO_REFERENCIA = 70;
// "dirección (referencia)" tiene que caber en el texto del viaje (200):
// 120 + 70 + 3 = 193.

/** Número que llega como texto del formulario. Vacío o raro = inválido (no 0). */
function numeroDeTexto(mensaje: string) {
  return z
    .string({ required_error: mensaje })
    .trim()
    .min(1, mensaje)
    .transform((valor) => Number(valor.replace(",", ".")))
    .refine((valor) => Number.isFinite(valor), mensaje);
}

const idViaje = z.string({ required_error: "Falta el viaje." }).uuid("Ese viaje no existe.");

export const esquemaPedirViaje = z.object({
  origen_lat: numeroDeTexto("Necesitamos tu ubicación para recogerte.").refine(
    (v) => v >= -90 && v <= 90,
    "Esa ubicación no es válida.",
  ),
  origen_lng: numeroDeTexto("Necesitamos tu ubicación para recogerte.").refine(
    (v) => v >= -180 && v <= 180,
    "Esa ubicación no es válida.",
  ),
  direccion: z
    .string({ required_error: "Escribe dónde te recogemos." })
    .trim()
    .min(3, "Escribe dónde te recogemos (dirección o barrio).")
    .max(LARGO_DIRECCION, `Máximo ${LARGO_DIRECCION} caracteres.`),
  referencia: z
    .string()
    .trim()
    .max(LARGO_REFERENCIA, `Máximo ${LARGO_REFERENCIA} caracteres.`)
    .optional()
    .transform((valor) => valor || undefined),
});

/** Texto del punto de recogida tal como se guarda: "dirección (referencia)". */
export function textoDeRecogida(datos: { direccion: string; referencia?: string }): string {
  return datos.referencia ? `${datos.direccion} (${datos.referencia})` : datos.direccion;
}

export const esquemaIdViaje = z.object({ viaje: idViaje });

export const esquemaOferta = z.object({
  viaje: idViaje,
  precio: numeroDeTexto("Escribe tu precio.")
    .refine((v) => Number.isInteger(v), "El precio debe ser en pesos enteros.")
    .refine(
      (v) => v >= PRECIO_MINIMO && v <= PRECIO_MAXIMO,
      `El precio debe estar entre ${pesos(PRECIO_MINIMO)} y ${pesos(PRECIO_MAXIMO)}.`,
    ),
});

export const esquemaAceptarOferta = z.object({
  oferta: z.string({ required_error: "Falta la oferta." }).uuid("Esa oferta no existe."),
});

export const esquemaCalificacion = z.object({
  viaje: idViaje,
  estrellas: numeroDeTexto("Elige de 1 a 5 estrellas.").refine(
    (v) => Number.isInteger(v) && v >= 1 && v <= 5,
    "Elige de 1 a 5 estrellas.",
  ),
  comentario: z
    .string()
    .trim()
    .max(300, "El comentario puede tener hasta 300 caracteres.")
    .optional()
    .transform((valor) => valor || undefined),
});

/** Placa colombiana en mayúsculas y sin espacios: ABC123 (carro) o ABC12D (moto). */
export const esquemaVehiculo = z.object({
  placa: z
    .string({ required_error: "Escribe la placa." })
    .transform((valor) => valor.replace(/[\s-]/g, "").toUpperCase())
    .refine((valor) => /^[A-Z]{3}[0-9]{2}[0-9A-Z]$/.test(valor), "La placa debe verse así: ABC123 o ABC12D."),
  marca: z.string({ required_error: "Escribe la marca." }).trim().min(1, "Escribe la marca.").max(40, "Máximo 40 caracteres."),
  modelo: z.string({ required_error: "Escribe el modelo." }).trim().min(1, "Escribe el modelo.").max(40, "Máximo 40 caracteres."),
  color: z.string({ required_error: "Escribe el color." }).trim().min(1, "Escribe el color.").max(30, "Máximo 30 caracteres."),
});

export const esquemaDisponibilidad = z.object({
  disponible: z.enum(["si", "no"]),
});

/** Ubicación que manda el teléfono del conductor (013). */
export const esquemaUbicacion = z.object({
  viaje: idViaje,
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  precision: z.number().finite().min(0).max(100_000).optional(),
});

/** Calificación de un puesto de un cupo terminado (014): mismas estrellas y comentario. */
export const esquemaCalificacionPuesto = esquemaCalificacion.omit({ viaje: true }).extend({
  puesto: z.string({ required_error: "Falta el puesto." }).uuid("Ese viaje no existe."),
  cupo: z.string({ required_error: "Falta el cupo." }).uuid("Ese viaje no existe."),
});
