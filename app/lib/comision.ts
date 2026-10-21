// Comisión de UniGo: el 10 % del precio de la oferta, que se le descuenta al
// conductor (el estudiante paga exactamente lo ofertado). Decisión del equipo,
// ver docs/reglas.md. El cobro real llega con la billetera (fase de pagos);
// por ahora solo se usa para mostrar cuánto recibe el conductor.

export const PORCENTAJE_COMISION = 10;

/** Pesos que se queda UniGo. Se redondea al peso más cercano (provisional). */
export function comision(precio: number): number {
  return Math.round((precio * PORCENTAJE_COMISION) / 100);
}

/** Pesos que recibe el conductor: precio menos la comisión. */
export function gananciaConductor(precio: number): number {
  return precio - comision(precio);
}
