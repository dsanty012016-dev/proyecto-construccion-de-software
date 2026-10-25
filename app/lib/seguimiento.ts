// Reglas del seguimiento en vivo y del enlace para compartir, como funciones
// puras (la hora entra por parámetro). La base las repite y las hace cumplir
// en 013-seguimiento.sql; las pruebas están en seguimiento.test.ts.

/** Cada cuánto manda el conductor su ubicación mientras el viaje está activo. */
export const INTERVALO_UBICACION_MS = 5_000;
/** Pasado este tiempo sin noticias, la ubicación se muestra como vieja. */
export const UBICACION_VIEJA_MS = 30_000;

/** ¿Ya toca mandar otra ubicación? (la primera, siempre). */
export function tocaEnviar(ultimoEnvioMs: number | null, ahoraMs: number): boolean {
  return ultimoEnvioMs === null || ahoraMs - ultimoEnvioMs >= INTERVALO_UBICACION_MS;
}

/** El viaje se sigue en vivo y se puede compartir solo mientras está aceptado o en curso. */
export function viajeSeSigue(estado: string): boolean {
  return estado === "aceptado" || estado === "en_curso";
}

/** El token del enlace: 64 caracteres hexadecimales (así lo crea la base). */
export function tokenValido(token: string): boolean {
  return /^[0-9a-f]{64}$/.test(token);
}

/** Dirección completa del enlace para compartir. */
export function enlaceCompartido(origen: string, token: string): string {
  return `${origen.replace(/\/+$/, "")}/compartido/${token}`;
}

/** Texto de qué tan reciente es la ubicación: "hace un momento", "hace 2 min"... */
export function textoUbicacion(actualizadoMs: number | null, ahoraMs: number): string {
  if (actualizadoMs === null || !Number.isFinite(actualizadoMs)) return "Esperando la ubicación del conductor";
  const segundos = Math.max(0, Math.round((ahoraMs - actualizadoMs) / 1000));
  if (segundos * 1000 <= UBICACION_VIEJA_MS) return "Ubicación en vivo";
  if (segundos < 120) return `Última ubicación hace ${segundos} s`;
  return `Última ubicación hace ${Math.floor(segundos / 60)} min`;
}
