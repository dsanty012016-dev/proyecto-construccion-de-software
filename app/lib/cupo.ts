import type { Coordenada } from "./mapa";

// Reglas de los cupos publicados por el conductor, como funciones puras (la
// hora entra por parámetro). La base de datos las repite y las hace cumplir
// en 010-cupos.sql; aquí sirven para la pantalla y se prueban en cupo.test.ts.

export const ANTICIPACION_MINIMA_MIN = 15;
export const ANTICIPACION_MAXIMA_DIAS = 7;
export const PUESTOS_MAXIMOS_CARRO = 4;

/** Placa de moto: termina en letra (ABC12D). La de carro termina en número (ABC123). */
export function esMoto(placa: string): boolean {
  return /^[A-Z]{3}[0-9]{2}[A-Z]$/.test(placa.toUpperCase());
}

/** Cuántos puestos puede ofrecer según su vehículo. */
export function puestosMaximos(placa: string): number {
  return esMoto(placa) ? 1 : PUESTOS_MAXIMOS_CARRO;
}

/** La salida debe estar entre 15 minutos y 7 días desde ahora. */
export function salidaValida(saleMs: number, ahoraMs: number): boolean {
  return (
    Number.isFinite(saleMs) &&
    saleMs >= ahoraMs + ANTICIPACION_MINIMA_MIN * 60_000 &&
    saleMs <= ahoraMs + ANTICIPACION_MAXIMA_DIAS * 86_400_000
  );
}

/**
 * Lo que da un <input type="datetime-local"> ("2026-10-22T06:30") en hora de
 * Colombia (UTC-5, sin horario de verano) → ISO con zona. Null si no es válido.
 */
export function horaLocalAIso(valor: string): string | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(valor.trim());
  if (!partes) return null;
  const [, anio, mes, dia, hora, minuto] = partes.map(Number);
  const ms = Date.UTC(anio, mes - 1, dia, hora + 5, minuto);
  const comprobar = new Date(ms - 5 * 3600 * 1000);
  // Descarta fechas que no existen (31 de febrero, 25:00...).
  if (
    comprobar.getUTCFullYear() !== anio ||
    comprobar.getUTCMonth() !== mes - 1 ||
    comprobar.getUTCDate() !== dia ||
    comprobar.getUTCHours() !== hora ||
    comprobar.getUTCMinutes() !== minuto
  ) {
    return null;
  }
  return new Date(ms).toISOString();
}

/** Puestos que quedan para aprobar. */
export function puestosLibres(total: number, aprobados: number): number {
  return Math.max(0, total - aprobados);
}

/**
 * Distancia aproximada (km) de un punto al tramo recto entre a y b. Sirve para
 * decirle al conductor qué tan lejos de su camino queda una recogida. Usa una
 * proyección plana local: con distancias de ciudad el error es mínimo.
 */
export function distanciaATramoKm(p: Coordenada, a: Coordenada, b: Coordenada): number {
  const kmPorGradoLat = 111.32;
  const kmPorGradoLng = 111.32 * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  const x = (c: Coordenada) => c.lng * kmPorGradoLng;
  const y = (c: Coordenada) => c.lat * kmPorGradoLat;
  const [ax, ay, bx, by, px, py] = [x(a), y(a), x(b), y(b), x(p), y(p)];
  const dx = bx - ax;
  const dy = by - ay;
  const largo2 = dx * dx + dy * dy;
  const t = largo2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / largo2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Cómo se llama cada estado de un puesto en las pantallas. */
export function etiquetaPuesto(estado: "pendiente" | "aprobado" | "rechazado" | "retirado" | "cancelado"): string {
  const etiquetas = {
    pendiente: "Esperando al conductor",
    aprobado: "Puesto aprobado",
    rechazado: "No aprobada",
    retirado: "La retiraste",
    cancelado: "Cupo cancelado",
  };
  return etiquetas[estado];
}
