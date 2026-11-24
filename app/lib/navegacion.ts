import type { Coordenada } from "./mapa";

// Enlaces para que el conductor abra su ruta en la app de navegación que ya
// usa (Google Maps o Waze). Los abre el teléfono con su propia ubicación como
// punto de partida: UniGo no envía la posición del conductor a ninguno.

function punto({ lat, lng }: Coordenada): string {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

/** Google Maps en modo carro hacia el destino. */
export function enlaceGoogleMaps(destino: Coordenada): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${punto(destino)}&travelmode=driving`;
}

/** Waze navegando hacia el destino. */
export function enlaceWaze(destino: Coordenada): string {
  return `https://waze.com/ul?ll=${punto(destino)}&navigate=yes`;
}
