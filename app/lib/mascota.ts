// Uni como mascota: qué cara pone, qué consejo da cuando aparece solo y qué
// logros celebra. Son reglas puras (sin React ni reloj propio): la hora entra
// por parámetro. Las usan ui/comun/uni-mascota.tsx, el asistente y la
// celebración de logros. Los conteos de viajes los da la base (035-logros.sql).

import { DESTINOS, horaEnColombia, type AccionAsistente, type IdDestino, type RolAsistente } from "./asistente";

export type ExpresionUni = "normal" | "feliz" | "sueno" | "preocupado" | "celebrando";

/** Texto para lectores de pantalla según la cara de Uni. */
export const NOMBRE_EXPRESION: Record<ExpresionUni, string> = {
  normal: "tranquilo",
  feliz: "feliz",
  sueno: "con sueño",
  preocupado: "preocupado",
  celebrando: "celebrando",
};

/** De madrugada (antes de las 6 en Colombia) Uni tiene sueño; el resto del día está tranquilo. */
export function expresionPorHora(ahora: Date): ExpresionUni {
  return horaEnColombia(ahora).h < 6 ? "sueno" : "normal";
}

/** Primer nombre para el saludo: "Laura María Gómez" → "Laura". Vacío si no hay. */
export function primerNombre(nombre: string | null | undefined): string {
  const limpio = (nombre ?? "").trim().split(/\s+/)[0] ?? "";
  return limpio.slice(0, 30);
}

// ---------- Consejos: Uni aparece solo, máximo una vez al día ----------

export interface ConsejoUni {
  texto: string;
  accion: AccionAsistente;
}

function accion(id: IdDestino): AccionAsistente {
  return { etiqueta: DESTINOS[id].etiqueta, ruta: DESTINOS[id].ruta };
}

/**
 * El consejo que toca según el rol y la hora en Colombia. De noche cerrada
 * (de 11 p.m. a 5 a.m.) Uni no molesta: devuelve null.
 */
export function consejoDelMomento(rol: RolAsistente, ahora: Date): ConsejoUni | null {
  const { h } = horaEnColombia(ahora);
  if (h < 5 || h >= 23) return null;
  if (rol === "estudiante") {
    if (h < 11) return { texto: "¿Vas pa’ la U? Pide tu viaje y los conductores cercanos te mandan su precio.", accion: accion("pedir_ida") };
    if (h < 18) return { texto: "¿Ya sabes cómo vuelves a casa? Mira los cupos de regreso con hora fija.", accion: accion("cupos_regreso") };
    return { texto: "¿Madrugas mañana? Aparta un cupo desde hoy y duermes diez minutos más.", accion: accion("cupos_ida") };
  }
  if (h < 11) return { texto: "¿Sales pa’ la U con puestos libres? Publica tu cupo y que te ayuden con la gasolina.", accion: accion("publicar_cupo") };
  if (h < 18) return { texto: "¿Vuelves a casa en carro? Publica un cupo de regreso y no vayas solo.", accion: accion("publicar_cupo") };
  return { texto: "Publica desde hoy tu cupo de mañana: los madrugadores lo apartan temprano.", accion: accion("publicar_cupo") };
}

/** Día en Colombia como "AAAA-MM-DD", para saber si el consejo de hoy ya salió. */
export function diaEnColombia(ahora: Date): string {
  return new Date(ahora.getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Máximo un consejo al día: sale si el último que se mostró (o cerró) fue otro día. */
export function debeMostrarConsejo(ultimoDia: string | null, ahora: Date): boolean {
  return ultimoDia !== diaEnColombia(ahora);
}

// ---------- Logros ----------

export const IDS_LOGRO = [
  "primer_viaje_estudiante",
  "diez_viajes_estudiante",
  "primer_viaje_conductor",
  "diez_viajes_conductor",
  "primeras_cinco_estrellas",
] as const;

export type IdLogro = (typeof IDS_LOGRO)[number];

export const LOGROS: Record<IdLogro, { titulo: string; texto: string }> = {
  primer_viaje_estudiante: { titulo: "¡Primer viaje!", texto: "Llegaste con UniGo. Uni ya te está haciendo barra para el próximo." },
  diez_viajes_estudiante: { titulo: "¡10 viajes!", texto: "Diez veces sin depender del grupo de WhatsApp. Eso merece aplausos." },
  primer_viaje_conductor: { titulo: "¡Primer viaje como conductor!", texto: "Llevaste a un compañero y te ayudaste con la gasolina. Así se hace." },
  diez_viajes_conductor: { titulo: "¡10 viajes como conductor!", texto: "Diez trayectos compartidos. Tu carro ya pide más compañía." },
  primeras_cinco_estrellas: { titulo: "¡Tus primeras 5 estrellas!", texto: "Alguien te calificó con 5 estrellas. Uni no está celoso… bueno, un poquito." },
};

export function esIdLogro(valor: unknown): valor is IdLogro {
  return typeof valor === "string" && (IDS_LOGRO as readonly string[]).includes(valor);
}

/** Lo que cuenta la base para la persona: viajes terminados por rol y calificaciones de 5 recibidas. */
export interface ConteoLogros {
  viajesEstudiante: number;
  viajesConductor: number;
  cincoEstrellas: number;
}

/**
 * Logros alcanzados por el rol en que está la persona. Cada rol tiene los
 * suyos; las primeras 5 estrellas cuentan en cualquiera.
 */
export function logrosAlcanzados(conteo: ConteoLogros, rol: RolAsistente): IdLogro[] {
  const viajes = rol === "estudiante" ? conteo.viajesEstudiante : conteo.viajesConductor;
  const logros: IdLogro[] = [];
  if (viajes >= 1) logros.push(rol === "estudiante" ? "primer_viaje_estudiante" : "primer_viaje_conductor");
  if (viajes >= 10) logros.push(rol === "estudiante" ? "diez_viajes_estudiante" : "diez_viajes_conductor");
  if (conteo.cincoEstrellas >= 1) logros.push("primeras_cinco_estrellas");
  return logros;
}

/** Los alcanzados que aún no se celebraron, en orden. */
export function logrosPorCelebrar(alcanzados: readonly IdLogro[], celebrados: readonly string[]): IdLogro[] {
  return alcanzados.filter((id) => !celebrados.includes(id));
}
