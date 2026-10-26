// Datos de la política de privacidad (Ley 1581 de 2012). Cambiar la versión
// obliga a todos a volver a aceptarla la próxima vez que entren (016).

/** Fecha de la versión vigente (AAAA-MM-DD). */
export const VERSION_POLITICA = "2026-10-25";

/** Correos del equipo para consultas y reclamos sobre datos personales. */
export const CORREOS_PRIVACIDAD = ["dsanty012016@gmail.com", "davidedu.durana@gmail.com"] as const;

/** Enlace que abre un correo dirigido a los dos a la vez. */
export const ENLACE_CORREO_PRIVACIDAD = `mailto:${CORREOS_PRIVACIDAD.join(",")}?subject=${encodeURIComponent("Mis datos en UniGo")}`;

/** ¿Esta persona tiene aceptada la versión vigente? */
export function politicaAlDia(versionAceptada: string | null | undefined): boolean {
  return versionAceptada === VERSION_POLITICA;
}
