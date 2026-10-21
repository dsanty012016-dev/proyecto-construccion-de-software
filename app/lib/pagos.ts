import { comision } from "./comision";

// Reglas de dinero como funciones puras (la hora entra por parámetro). La base
// las hace cumplir en 012-billetera.sql; aquí sirven para avisar en pantalla
// cuánto se cobra o se devuelve antes de confirmar. Pruebas en pagos.test.ts.

export const RECARGA_MINIMA = 2_000;
export const RECARGA_MAXIMA = 500_000;
export const SALDO_MAXIMO = 1_000_000;
export const COBRO_CANCELACION_VIAJE = 20; // % para el estudiante que cancela con el conductor en camino
export const COBRO_CUPO_TARDE = 30; // % para quien deja un cupo a menos de 40 minutos
export const MINUTOS_CUPO_SIN_COBRO = 40;
export const MINUTOS_LIMITE_PAGO = 10;
export const STRIKES_PARA_SUSPENDER = 3;

function porcentaje(monto: number, pct: number): number {
  return Math.round((monto * pct) / 100);
}

/** El estudiante cancela un viaje aceptado sin justificar: cuánto se cobra y cuánto se devuelve. */
export function cancelacionDeViaje(precio: number): { cobro: number; devolucion: number; alConductor: number } {
  const cobro = porcentaje(precio, COBRO_CANCELACION_VIAJE);
  return { cobro, devolucion: precio - cobro, alConductor: cobro - comision(cobro) };
}

/** Dejar un puesto pagado: con 40 minutos o más se devuelve todo; con menos, se cobra el 30 %. */
export function salidaDeCupo(pagado: number, saleMs: number, ahoraMs: number): { cobro: number; devolucion: number; tarde: boolean } {
  const tarde = ahoraMs > saleMs - MINUTOS_CUPO_SIN_COBRO * 60_000;
  const cobro = tarde ? porcentaje(pagado, COBRO_CUPO_TARDE) : 0;
  return { cobro, devolucion: pagado - cobro, tarde };
}

/** Hasta cuándo se puede pagar un puesto (10 minutos antes de la salida). */
export function limiteDePago(saleMs: number): number {
  return saleMs - MINUTOS_LIMITE_PAGO * 60_000;
}

export function puedePagarPuesto(saleMs: number, ahoraMs: number): boolean {
  return ahoraMs <= limiteDePago(saleMs);
}

/** Días de la suspensión número n (1, 2, 3...): 3, 7, 15 y luego 30. */
export function diasDeSuspension(nivel: number): number {
  if (nivel <= 1) return 3;
  if (nivel === 2) return 7;
  if (nivel === 3) return 15;
  return 30;
}

/** Revisa el monto de una recarga. Devuelve el mensaje de error o null. */
export function problemaConRecarga(monto: number, saldoActual: number): string | null {
  if (!Number.isInteger(monto) || monto < RECARGA_MINIMA || monto > RECARGA_MAXIMA) {
    return "La recarga debe ser entre $2.000 y $500.000.";
  }
  if (saldoActual + monto > SALDO_MAXIMO) return "Tu saldo no puede pasar de $1.000.000.";
  return null;
}
