import type { Coordenada } from "./mapa";

// Rutas por las vías con el servicio público de
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
export function urlRuta(origen: Coordenada, destino: Coordenada, paradas: readonly Coordenada[] = []): string {
  const opciones = "overview=full&geometries=geojson&alternatives=false&steps=false";
  return `${urlOsrm("route", [origen, ...paradas, destino])}?${opciones}${paradas.length ? "&continue_straight=false" : ""}`;
}

function urlOsrm(servicio: "route" | "table", puntos: readonly Coordenada[]) {
  const coordenadas = puntos.map((c) => `${c.lng.toFixed(6)},${c.lat.toFixed(6)}`).join(";");
  return `https://routing.openstreetmap.de/routed-car/${servicio}/v1/driving/${coordenadas}`;
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

export type MatrizDeTiempos = readonly (readonly (number | null)[])[];

export function leerTiempos(respuesta: unknown, cantidad: number): MatrizDeTiempos | null {
  if (typeof respuesta !== "object" || respuesta === null) return null;
  const { code, durations } = respuesta as { code?: unknown; durations?: unknown };
  if (code !== "Ok" || !Array.isArray(durations) || durations.length !== cantidad) return null;
  const valida = durations.every((fila) =>
    Array.isArray(fila) && fila.length === cantidad &&
    fila.every((valor) => valor === null || (Number.isFinite(valor) && valor >= 0)),
  );
  return valida ? durations : null;
}

const rutas = new Map<string, Promise<RutaVial | null>>();
const matrices = new Map<string, Promise<MatrizDeTiempos | null>>();
let proximoTurno = Promise.resolve();

/** Reutiliza consultas y espacia los inicios de solicitudes por pestaña. */
function consultar<T>(url: string, memoria: Map<string, Promise<T | null>>, leer: (datos: unknown) => T | null) {
  const guardada = memoria.get(url);
  if (guardada) return guardada;
  const turno = proximoTurno;
  proximoTurno = turno.then(() => new Promise<void>((resolver) => setTimeout(resolver, 1000)));
  const pedido = turno
    .then(() => fetch(url, { signal: AbortSignal.timeout(8000) }))
    .then((r) => (r.ok ? r.json() : null))
    .then(leer)
    .catch(() => null);
  memoria.set(url, pedido);
  // Si falló, se olvida para poder intentarlo de nuevo más tarde.
  pedido.then((resultado) => {
    if (resultado === null) memoria.delete(url);
  });
  return pedido;
}

export function buscarRuta(origen: Coordenada, destino: Coordenada, paradas: readonly Coordenada[] = []) {
  return consultar(urlRuta(origen, destino, paradas), rutas, leerRuta);
}

export function buscarTiempos(puntos: readonly Coordenada[]) {
  return consultar(`${urlOsrm("table", puntos)}?annotations=duration`, matrices, (datos) => leerTiempos(datos, puntos.length));
}
