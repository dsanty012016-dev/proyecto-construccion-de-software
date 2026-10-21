import type { Coordenada } from "./mapa";

// Ruta por las vías entre dos puntos, con el servicio público de rutas de
// FOSSGIS (OSRM sobre datos de OpenStreetMap). Política de uso: máximo una
// consulta por segundo, sin uso masivo y mostrando los créditos
// (https://routing.openstreetmap.de/about.html). La app pide una ruta por
// mapa y la guarda en memoria; si el servicio falla, el mapa dibuja la línea recta.

export const CREDITO_RUTAS =
  'Rutas: <a href="https://routing.openstreetmap.de/about.html" target="_blank" rel="noopener">FOSSGIS OSRM</a> · <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener">Mejorar el mapa</a>';

export interface RutaVial {
  /** Puntos [lng, lat] de la ruta, en el orden del recorrido. */
  coordenadas: [number, number][];
  km: number;
  minutos: number;
}

/** URL de la consulta (carro, geometría completa en GeoJSON). Pura, con prueba. */
export function urlRuta(origen: Coordenada, destino: Coordenada): string {
  const punto = (c: Coordenada) => `${c.lng.toFixed(6)},${c.lat.toFixed(6)}`;
  return `https://routing.openstreetmap.de/routed-car/route/v1/driving/${punto(origen)};${punto(destino)}?overview=full&geometries=geojson&alternatives=false&steps=false`;
}

/** Lee la respuesta de OSRM. Devuelve null si no trae una ruta usable. Pura, con prueba. */
export function leerRuta(respuesta: unknown): RutaVial | null {
  if (typeof respuesta !== "object" || respuesta === null) return null;
  const datos = respuesta as { code?: unknown; routes?: unknown };
  if (datos.code !== "Ok" || !Array.isArray(datos.routes) || datos.routes.length === 0) return null;
  const ruta = datos.routes[0] as { distance?: unknown; duration?: unknown; geometry?: { coordinates?: unknown } };
  const coordenadas = ruta.geometry?.coordinates;
  if (
    typeof ruta.distance !== "number" ||
    typeof ruta.duration !== "number" ||
    !Array.isArray(coordenadas) ||
    coordenadas.length < 2 ||
    !coordenadas.every((p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]))
  ) {
    return null;
  }
  return {
    coordenadas: coordenadas.map((p: number[]) => [p[0], p[1]] as [number, number]),
    km: ruta.distance / 1000,
    minutos: Math.max(1, Math.round(ruta.duration / 60)),
  };
}

const enMemoria = new Map<string, Promise<RutaVial | null>>();

/** Pide la ruta (una sola vez por par de puntos mientras la pestaña esté abierta). */
export function buscarRuta(origen: Coordenada, destino: Coordenada): Promise<RutaVial | null> {
  const url = urlRuta(origen, destino);
  const guardada = enMemoria.get(url);
  if (guardada) return guardada;
  const pedido = fetch(url, { signal: AbortSignal.timeout(8000) })
    .then((r) => (r.ok ? r.json() : null))
    .then(leerRuta)
    .catch(() => null);
  enMemoria.set(url, pedido);
  // Si falló, se olvida para poder intentarlo de nuevo más tarde.
  pedido.then((ruta) => {
    if (!ruta) enMemoria.delete(url);
  });
  return pedido;
}
