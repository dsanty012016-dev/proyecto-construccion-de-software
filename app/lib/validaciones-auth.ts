import { z } from "zod";

// Validación de los formularios de acceso. Corre en el servidor (Server
// Actions) antes de llamar a Supabase; la base de datos vuelve a revisar el
// dominio del correo y el teléfono por su cuenta (002-perfiles.sql).

export const DOMINIO_INSTITUCIONAL = "ustavillavo.edu.co";
export const LARGO_MINIMO_CLAVE = 8;

const correo = z
  .string({ required_error: "Escribe tu correo." })
  .trim()
  .toLowerCase()
  .min(1, "Escribe tu correo.")
  .email("Ese correo no es válido.");

const correoInstitucional = correo.refine(
  (valor) => valor.endsWith(`@${DOMINIO_INSTITUCIONAL}`) && valor.split("@").length === 2,
  `Usa tu correo institucional (@${DOMINIO_INSTITUCIONAL}).`,
);

const clave = z
  .string({ required_error: "Escribe una contraseña." })
  .min(LARGO_MINIMO_CLAVE, `La contraseña debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.`)
  // bcrypt (lo que usa Supabase) solo tiene en cuenta los primeros 72 bytes.
  .max(72, "La contraseña es demasiado larga (máximo 72 caracteres).")
  .regex(/[A-Za-zÁÉÍÓÚÑáéíóúñ]/, "La contraseña debe tener al menos una letra.")
  .regex(/[0-9]/, "La contraseña debe tener al menos un número.");

/** Celular colombiano: 10 dígitos que empiezan por 3. Se guarda como +57... */
const telefono = z
  .string({ required_error: "Escribe tu celular." })
  .transform((valor) => valor.replace(/[\s\-()]/g, "").replace(/^\+?57(?=\d{10}$)/, ""))
  .refine((valor) => /^3\d{9}$/.test(valor), "El celular debe tener 10 dígitos y empezar por 3.")
  .transform((valor) => `+57${valor}`);

export const esquemaRegistro = z
  .object({
    nombre: z
      .string({ required_error: "Escribe tu nombre." })
      .trim()
      .min(2, "Escribe tu nombre completo.")
      .max(80, "El nombre es demasiado largo."),
    correo: correoInstitucional,
    telefono,
    rol: z.enum(["estudiante", "conductor"], {
      errorMap: () => ({ message: "Elige si eres estudiante o conductor." }),
    }),
    clave,
    confirmacion: z.string(),
    terminos: z.literal("on", {
      errorMap: () => ({ message: "Debes aceptar los términos para continuar." }),
    }),
  })
  .refine((datos) => datos.clave === datos.confirmacion, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmacion"],
  });

export const esquemaEntrar = z.object({
  correo,
  clave: z.string().min(1, "Escribe tu contraseña."),
});

export const esquemaRecuperar = z.object({ correo: correoInstitucional });

export const esquemaNuevaClave = z
  .object({ clave, confirmacion: z.string() })
  .refine((datos) => datos.clave === datos.confirmacion, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmacion"],
  });

export const esquemaRol = z.object({
  rol: z.enum(["estudiante", "conductor"], {
    errorMap: () => ({ message: "Elige si eres estudiante o conductor." }),
  }),
});

export type ErroresCampos = Partial<Record<string, string>>;

/** Primer mensaje de error por campo, listo para mostrar en el formulario. */
export function erroresPorCampo(error: z.ZodError): ErroresCampos {
  const salida: ErroresCampos = {};
  for (const problema of error.issues) {
    const campo = String(problema.path[0] ?? "general");
    salida[campo] ??= problema.message;
  }
  return salida;
}

/** Convierte un FormData en objeto plano de textos para validarlo. */
export function datosDelFormulario(formulario: FormData): Record<string, string> {
  const salida: Record<string, string> = {};
  formulario.forEach((valor, clave) => {
    if (typeof valor === "string") salida[clave] = valor;
  });
  return salida;
}
