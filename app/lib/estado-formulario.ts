import type { ErroresCampos } from "./validaciones-auth";

// Estado que devuelven las Server Actions de los formularios y que la pantalla
// muestra (errores por campo, mensaje general o confirmación). Vive aparte
// porque un archivo "use server" solo puede exportar funciones.
export interface EstadoFormulario {
  resultado: "inicial" | "error" | "listo";
  mensaje?: string;
  errores?: ErroresCampos;
  /** Lo que la persona escribió (sin contraseñas), para no borrárselo. */
  valores?: Record<string, string>;
}

export const ESTADO_INICIAL: EstadoFormulario = { resultado: "inicial" };
