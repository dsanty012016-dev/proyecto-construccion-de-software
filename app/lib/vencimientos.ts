import { horaCorta } from "./formato";

// Cuándo se cierran solas las solicitudes y los cupos, como funciones puras
// (la hora entra por parámetro). La base hace cumplir lo mismo en
// 018-vencimientos.sql con una tarea que corre cada minuto.

/** Una solicitud de viaje sin aceptar se cancela sola a los 15 minutos. */
export const MINUTOS_VENCE_SOLICITUD = 15;

/** Un cupo que no salió se cancela solo 5 minutos después de su hora. */
export const MINUTOS_VENCE_CUPO = 5;

/** Momento (ms) en que vence una solicitud creada en creadoMs. */
export function venceSolicitud(creadoMs: number): number {
  return creadoMs + MINUTOS_VENCE_SOLICITUD * 60_000;
}

export function solicitudVencida(creadoMs: number, ahoraMs: number): boolean {
  return ahoraMs >= venceSolicitud(creadoMs);
}

/** Momento (ms) en que vence un cupo que sale en saleMs. */
export function venceCupo(saleMs: number): number {
  return saleMs + MINUTOS_VENCE_CUPO * 60_000;
}

export function cupoVencido(saleMs: number, ahoraMs: number): boolean {
  return ahoraMs >= venceCupo(saleMs);
}

/** "6:45 p. m.", la hora de Colombia de un momento en ms. */
export function horaDe(ms: number): string {
  const { hora, periodo } = horaCorta(new Date(ms).toISOString());
  return `${hora} ${periodo}`;
}
