import { PUESTOS_MAXIMOS_CARRO } from "./cupo";
import type { MatrizDeTiempos } from "./ruta-vial";

export interface ComparacionDeParadas {
  /** Índices de las paradas en la matriz. La salida es 0 y el destino es el último. */
  orden: number[];
  segundosActuales: number;
  segundosSugeridos: number;
  adicionales: (number | null)[];
}

/** Compara hasta 24 órdenes. Mantiene los extremos y conserva el orden actual en empate. */
export function compararParadas(tiempos: MatrizDeTiempos): ComparacionDeParadas | null {
  const destino = tiempos.length - 1;
  if (destino < 2 || destino > PUESTOS_MAXIMOS_CARRO + 1) return null;

  const ordenActual = Array.from({ length: destino - 1 }, (_, i) => i + 1);
  const segundosActuales = duracion(tiempos, [0, ...ordenActual, destino]);
  if (!Number.isFinite(segundosActuales)) return null;

  let segundosSugeridos = segundosActuales;
  let orden = ordenActual;
  for (const candidato of permutaciones(ordenActual)) {
    const segundos = duracion(tiempos, [0, ...candidato, destino]);
    // Evita cambios por diferencias de redondeo de la matriz.
    if (segundos < segundosSugeridos - 0.01) {
      segundosSugeridos = segundos;
      orden = candidato;
    }
  }

  const ruta = [0, ...orden, destino];
  const adicionales = orden.map((parada, i) => {
    const anterior = ruta[i];
    const siguiente = ruta[i + 2];
    const directo = tiempos[anterior]?.[siguiente];
    if (directo == null) return null;
    return Math.max(0, duracion(tiempos, [anterior, parada, siguiente]) - directo);
  });
  return { orden, segundosActuales, segundosSugeridos, adicionales };
}

function duracion(tiempos: MatrizDeTiempos, ruta: number[]): number {
  let total = 0;
  for (let i = 1; i < ruta.length; i++) {
    total += tiempos[ruta[i - 1]]?.[ruta[i]] ?? Infinity;
  }
  return total;
}

function* permutaciones(indices: number[]): Generator<number[]> {
  if (indices.length === 0) {
    yield [];
    return;
  }
  for (const [i, primero] of indices.entries()) {
    const resto = indices.filter((_, j) => i !== j);
    for (const siguientes of permutaciones(resto)) yield [primero, ...siguientes];
  }
}
