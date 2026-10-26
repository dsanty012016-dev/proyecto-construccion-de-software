import { type Coordenada, distanciaKm } from "./mapa";

// Ida (a la U) o regreso (de la U a la casa), como funciones puras. La base
// de datos repite estas reglas en 017-viaje-de-regreso.sql; aquí sirven para
// la pantalla y se prueban en sentido.test.ts.

export type Sentido = "ida" | "regreso";

export const SENTIDOS: readonly Sentido[] = ["ida", "regreso"];

/** El punto de la U (destino en la ida, recogida en el regreso) queda a máximo esto de la sede. */
export const RADIO_U_KM = 0.5;

/** El otro punto (la casa) queda por lo menos a esto del de la U. */
export const DISTANCIA_MINIMA_KM = 0.1;

export interface Lugar extends Coordenada {
  texto: string;
}

export function esSentido(valor: unknown): valor is Sentido {
  return valor === "ida" || valor === "regreso";
}

/** ¿El punto sirve como punto de la U (máximo 500 m de la sede)? */
export function cercaDeLaU(punto: Coordenada, sede: Coordenada): boolean {
  return distanciaKm(punto, sede) <= RADIO_U_KM;
}

/**
 * De dónde sale y a dónde llega el viaje. En la ida sale de la casa y llega a
 * la U; en el regreso, al revés. No cambia los lugares que entran.
 */
export function extremos(sentido: Sentido, casa: Lugar, u: Lugar): { origen: Lugar; destino: Lugar } {
  return sentido === "ida" ? { origen: casa, destino: u } : { origen: u, destino: casa };
}

/**
 * Qué está mal con los puntos elegidos, con el mismo orden y las mismas
 * reglas que la base. Null si se puede pedir (o publicar).
 */
export function problemaConPuntos(casa: Coordenada, u: Coordenada, sede: Coordenada): string | null {
  if (!cercaDeLaU(u, sede)) return "El punto de la universidad debe estar a máximo 500 m de la sede.";
  if (distanciaKm(casa, u) < DISTANCIA_MINIMA_KM) return "Ese punto es la universidad. Elige uno más lejos.";
  return null;
}

/** Texto del punto en la U: "USTA Villavicencio (portería de la 40)". */
export function textoEnLaU(nombreSede: string, referencia?: string): string {
  const limpia = referencia?.trim();
  return limpia ? `${nombreSede} (${limpia})` : nombreSede;
}

/** El punto del estudiante en un viaje: su casa (la recogida en la ida, el destino en el regreso). */
export function puntoDeLaCasa(viaje: { sentido: Sentido; origen_texto: string; destino_texto: string }): string {
  return viaje.sentido === "regreso" ? viaje.destino_texto : viaje.origen_texto;
}

/**
 * Recorrido de un estudiante en un cupo. En la ida va de donde lo recogen a
 * la U; en el regreso, de la salida (la U) hasta donde se baja. Sin puesto,
 * el del cupo completo.
 */
export function recorridoDelPuesto(
  cupo: { sentido: Sentido; salida_texto: string; destino_texto: string },
  puntoEstudiante: string | null,
): { origen: string; destino: string } {
  if (cupo.sentido === "regreso") return { origen: cupo.salida_texto, destino: puntoEstudiante ?? cupo.destino_texto };
  return { origen: puntoEstudiante ?? cupo.salida_texto, destino: cupo.destino_texto };
}

/** Palabras de cada sentido, para que todas las pantallas digan lo mismo. */
export const PALABRAS: Record<Sentido, { corto: string; titulo: string; puntoEstudiante: string; preguntaEstudiante: string }> = {
  ida: {
    corto: "A la U",
    titulo: "Rumbo a la U",
    puntoEstudiante: "Te recogen en",
    preguntaEstudiante: "¿Dónde te recogemos?",
  },
  regreso: {
    corto: "De la U a casa",
    titulo: "Rumbo a casa",
    puntoEstudiante: "Te bajas en",
    preguntaEstudiante: "¿A dónde vas?",
  },
};
