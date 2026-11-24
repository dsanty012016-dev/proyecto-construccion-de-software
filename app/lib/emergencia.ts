// Botón de emergencia: reglas puras de cuándo aparece y los enlaces que usa.
// En Colombia la línea única de emergencias es el 123 (policía, ambulancia,
// bomberos). El botón aparece en viajes y cupos activos, para el estudiante y
// el conductor; el aviso a los administradores lo guarda la base (037).

export const NUMERO_EMERGENCIAS = "123";
export const ENLACE_LLAMADA_EMERGENCIA = `tel:${NUMERO_EMERGENCIAS}`;

export type SituacionEmergencia =
  | { tipo: "viaje"; estado: string }
  | { tipo: "cupo"; estado: string; soyConductor: boolean; pagado: boolean };

/**
 * Hay botón mientras el viaje o cupo está activo: un viaje con conductor
 * (aceptado o en curso); un cupo publicado o en camino, para su conductor y
 * para quien ya pagó su puesto.
 */
export function emergenciaDisponible(situacion: SituacionEmergencia): boolean {
  if (situacion.tipo === "viaje") return situacion.estado === "aceptado" || situacion.estado === "en_curso";
  const activo = situacion.estado === "publicado" || situacion.estado === "en_curso";
  return activo && (situacion.soyConductor || situacion.pagado);
}

/** Enlace para que un administrador vea en el mapa dónde se pidió ayuda. */
export function enlaceMapaEmergencia(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`;
}
