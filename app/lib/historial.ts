// Filtros de "Mis viajes" (/viajes): qué viajes y cupos se muestran según lo
// que la persona eligió en la URL. Son reglas puras (sin React ni reloj) para
// poder probarlas; la página solo lee la URL y pinta el resultado.
import type { CupoEnHistorial } from "./consultas-cupo";
import type { ItemHistorial } from "./consultas-viaje";

/** Un elemento del historial: un viaje por pedido o un cupo, con su fecha para ordenar. */
export type Item =
  | { tipo: "viaje"; fecha: number; dato: ItemHistorial }
  | { tipo: "cupo"; fecha: number; dato: CupoEnHistorial };

/** Lo mínimo que el filtro necesita saber de cada elemento (así las pruebas no arman filas completas). */
export type ItemFiltrable =
  | { tipo: "viaje"; dato: { viaje: { estado: string }; calificado: boolean } }
  | { tipo: "cupo"; dato: { cupo: { estado: string }; porCalificar: boolean } };

export const TIPOS = ["todos", "pedido", "cupo"] as const;
export const ESTADOS = ["todos", "terminado", "cancelado"] as const;

export interface Filtro {
  tipo: (typeof TIPOS)[number];
  estado: (typeof ESTADOS)[number];
  /** Solo lo que falta calificar. */
  pendientes: boolean;
}

export const SIN_FILTRO: Filtro = { tipo: "todos", estado: "todos", pendientes: false };

function estadoDe(item: ItemFiltrable): string {
  return item.tipo === "viaje" ? item.dato.viaje.estado : item.dato.cupo.estado;
}

/**
 * ¿Falta calificar? Solo si está terminado: un viaje o un cupo cancelado
 * nunca se califica, aunque el dato diga otra cosa.
 */
export function porCalificar(item: ItemFiltrable): boolean {
  if (estadoDe(item) !== "terminado") return false;
  return item.tipo === "viaje" ? !item.dato.calificado : item.dato.porCalificar;
}

/** Deja solo los elementos que cumplen el filtro, sin cambiar el orden. */
export function filtrarHistorial<T extends ItemFiltrable>(items: readonly T[], filtro: Filtro): T[] {
  return items.filter((item) => {
    if (filtro.tipo === "pedido" && item.tipo !== "viaje") return false;
    if (filtro.tipo === "cupo" && item.tipo !== "cupo") return false;
    if (filtro.estado !== "todos" && estadoDe(item) !== filtro.estado) return false;
    if (filtro.pendientes && !porCalificar(item)) return false;
    return true;
  });
}

/**
 * Enlace a /viajes con un filtro. Omite lo que está en "todos" para que la
 * URL quede corta y "sin filtros" sea simplemente /viajes.
 */
export function enlaceDeFiltro(filtro: Filtro): string {
  const partes = new URLSearchParams();
  if (filtro.tipo !== "todos") partes.set("tipo", filtro.tipo);
  if (filtro.estado !== "todos") partes.set("estado", filtro.estado);
  if (filtro.pendientes) partes.set("pendientes", "1");
  const consulta = partes.toString();
  return consulta ? `/viajes?${consulta}` : "/viajes";
}
