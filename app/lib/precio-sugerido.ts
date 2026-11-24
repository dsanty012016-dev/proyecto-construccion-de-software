// Precio sugerido por distancia. Es una referencia para el conductor, no un
// precio obligatorio: él sigue poniendo su precio (ver docs/reglas.md).
// Punto medio entre quien va a la U de todas formas (comparte gastos) y quien
// conduce para ganar: queda cerca de la mitad del taxi de Villavicencio 2026.

/** Viaje por pedido: base + valor por km, en pesos. */
export const SUGERIDO_VIAJE = { base: 1_800, porKm: 800 } as const;
/** Cupo: precio de cada puesto, porque el carro se reparte entre varios. */
export const SUGERIDO_PUESTO = { base: 1_000, porKm: 450 } as const;

const REDONDEO = 100;

function calcular(km: number, tarifa: { base: number; porKm: number }): number | null {
  if (!Number.isFinite(km) || km <= 0) return null;
  return Math.round((tarifa.base + tarifa.porKm * km) / REDONDEO) * REDONDEO;
}

/** Precio sugerido de un viaje por pedido, redondeado a $100. null si la distancia no sirve. */
export function precioSugeridoViaje(km: number): number | null {
  return calcular(km, SUGERIDO_VIAJE);
}

/** Precio sugerido por puesto de un cupo, redondeado a $100. null si la distancia no sirve. */
export function precioSugeridoPuesto(km: number): number | null {
  return calcular(km, SUGERIDO_PUESTO);
}
