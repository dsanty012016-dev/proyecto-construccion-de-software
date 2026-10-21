// Cálculos del mapa como funciones puras (sin MapLibre ni navegador), con prueba.

export interface Coordenada {
  lat: number;
  lng: number;
}

/**
 * Estilo oscuro de OpenFreeMap: gratis, sin clave y con datos de
 * OpenStreetMap (los créditos los pone el propio mapa).
 */
export const ESTILO_MAPA = "https://tiles.openfreemap.org/styles/dark";

const RADIO_TIERRA_KM = 6371;

export function coordenadaValida(c: Coordenada | null | undefined): c is Coordenada {
  return (
    !!c &&
    Number.isFinite(c.lat) &&
    Number.isFinite(c.lng) &&
    c.lat >= -90 &&
    c.lat <= 90 &&
    c.lng >= -180 &&
    c.lng <= 180
  );
}

/** Distancia en línea recta (fórmula de haversine), en kilómetros. */
export function distanciaKm(a: Coordenada, b: Coordenada): number {
  const rad = (grados: number) => (grados * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 0.85 → "850 m"; 4.23 → "4,2 km". */
export function distanciaTexto(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  return `${(Math.round(km * 10) / 10).toFixed(1).replace(".", ",")} km`;
}

/** Recorta a 6 decimales (unos 10 cm): más no sirve y alarga lo que se guarda. */
export function redondear(c: Coordenada): Coordenada {
  const r = (n: number) => Math.round(n * 1e6) / 1e6;
  return { lat: r(c.lat), lng: r(c.lng) };
}

/** Caja [[oeste, sur], [este, norte]] que contiene todos los puntos (para encuadrar el mapa). */
export function limites(puntos: readonly Coordenada[]): [[number, number], [number, number]] | null {
  const validos = puntos.filter(coordenadaValida);
  if (validos.length === 0) return null;
  const lats = validos.map((p) => p.lat);
  const lngs = validos.map((p) => p.lng);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}
