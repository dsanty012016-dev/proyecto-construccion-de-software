/**
 * Reglas del viaje de UniGo, como funciones puras (sin React, sin base de
 * datos, sin reloj propio). La hora entra por parámetro (`ahora`, en ms).
 *
 * Flujo (ver docs/reglas.md):
 *   solicitado ──(el estudiante acepta una oferta)──▶ aceptado
 *   aceptado ──(el conductor recoge al estudiante)──▶ en_curso
 *   en_curso ──(el conductor llega)──▶ terminado
 *   solicitado | aceptado ──(cualquiera de los dos cancela)──▶ cancelado
 *
 * Mientras está "solicitado", los conductores ofertan su precio; "con ofertas"
 * no es un estado aparte, se deduce de que haya ofertas activas.
 *
 * Si una acción no es válida, `aplicarAccion` devuelve el MISMO objeto, sin
 * lanzar error. La base de datos (supabase/migraciones) repite estas reglas en
 * sus funciones RPC: allá es donde de verdad se hacen cumplir; aquí sirven para
 * la pantalla y para probarlas.
 */

export type EstadoViaje =
  | "solicitado"
  | "aceptado"
  | "en_curso"
  | "terminado"
  | "cancelado";

export type EstadoOferta = "activa" | "retirada" | "aceptada" | "rechazada";

export interface Punto {
  lat: number;
  lng: number;
  /** Dirección o referencia que se le muestra a la otra persona. */
  texto: string;
}

export interface Oferta {
  id: string;
  conductorId: string;
  /** Pesos colombianos, entero. */
  precio: number;
  estado: EstadoOferta;
  creadaEn: number;
}

export interface Viaje {
  id: string;
  estudianteId: string;
  origen: Punto;
  destino: Punto;
  estado: EstadoViaje;
  ofertas: readonly Oferta[];
  /** Se llena al aceptar una oferta. */
  conductorId: string | null;
  /** Precio acordado: el de la oferta aceptada. */
  precio: number | null;
  creadoEn: number;
  aceptadoEn: number | null;
  iniciadoEn: number | null;
  terminadoEn: number | null;
  canceladoEn: number | null;
  canceladoPor: string | null;
}

export type Accion =
  | { tipo: "ofertar"; ofertaId: string; conductorId: string; precio: number }
  | { tipo: "retirar_oferta"; conductorId: string }
  | { tipo: "aceptar_oferta"; estudianteId: string; ofertaId: string }
  | { tipo: "iniciar"; conductorId: string }
  | { tipo: "terminar"; conductorId: string }
  | { tipo: "cancelar"; usuarioId: string };

/**
 * Límites técnicos del precio para atajar errores de digitación (por ejemplo,
 * escribir 80000 en vez de 8000). No son una tarifa: el precio lo pone el
 * conductor. Deben coincidir con los de 004-viajes.sql.
 */
export const PRECIO_MINIMO = 1_000;
export const PRECIO_MAXIMO = 100_000;
export const LARGO_MAXIMO_TEXTO = 200;

const ESTADOS_ACTIVOS: readonly EstadoViaje[] = [
  "solicitado",
  "aceptado",
  "en_curso",
];

// ---------------------------------------------------------------------------
// Validaciones sueltas (también las usan los formularios)
// ---------------------------------------------------------------------------

export function precioValido(precio: number): boolean {
  return (
    Number.isInteger(precio) &&
    precio >= PRECIO_MINIMO &&
    precio <= PRECIO_MAXIMO
  );
}

export function puntoValido(punto: Punto): boolean {
  const texto = punto.texto.trim();
  return (
    Number.isFinite(punto.lat) &&
    Number.isFinite(punto.lng) &&
    punto.lat >= -90 &&
    punto.lat <= 90 &&
    punto.lng >= -180 &&
    punto.lng <= 180 &&
    texto.length > 0 &&
    texto.length <= LARGO_MAXIMO_TEXTO
  );
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

/** Un viaje activo bloquea pedir otro (estudiante) o aceptar otro (conductor). */
export function estaActivo(viaje: Viaje): boolean {
  return ESTADOS_ACTIVOS.includes(viaje.estado);
}

export function ofertasActivas(viaje: Viaje): Oferta[] {
  return viaje.ofertas.filter((o) => o.estado === "activa");
}

export function tieneOfertas(viaje: Viaje): boolean {
  return viaje.estado === "solicitado" && ofertasActivas(viaje).length > 0;
}

export function esParticipante(viaje: Viaje, usuarioId: string): boolean {
  return (
    viaje.estudianteId === usuarioId ||
    (viaje.conductorId !== null && viaje.conductorId === usuarioId)
  );
}

/** Regla provisional (pregunta 8 de docs/reglas.md): sin penalización. */
export function puedeCancelar(viaje: Viaje, usuarioId: string): boolean {
  if (viaje.estado === "solicitado") return viaje.estudianteId === usuarioId;
  if (viaje.estado === "aceptado") return esParticipante(viaje, usuarioId);
  return false;
}

/** Texto corto para la pantalla. */
export function etiquetaEstado(viaje: Viaje): string {
  switch (viaje.estado) {
    case "solicitado":
      return tieneOfertas(viaje) ? "Con ofertas" : "Buscando conductor";
    case "aceptado":
      return "Conductor en camino";
    case "en_curso":
      return "En curso";
    case "terminado":
      return "Terminado";
    case "cancelado":
      return "Cancelado";
  }
}

// ---------------------------------------------------------------------------
// Crear y cambiar un viaje
// ---------------------------------------------------------------------------

/** Devuelve null si los datos no sirven para pedir un viaje. */
export function crearViaje(datos: {
  id: string;
  estudianteId: string;
  origen: Punto;
  destino: Punto;
  ahora: number;
}): Viaje | null {
  const { origen, destino } = datos;
  if (!puntoValido(origen) || !puntoValido(destino)) return null;
  if (origen.lat === destino.lat && origen.lng === destino.lng) return null;

  return {
    id: datos.id,
    estudianteId: datos.estudianteId,
    origen: { ...origen, texto: origen.texto.trim() },
    destino: { ...destino, texto: destino.texto.trim() },
    estado: "solicitado",
    ofertas: [],
    conductorId: null,
    precio: null,
    creadoEn: datos.ahora,
    aceptadoEn: null,
    iniciadoEn: null,
    terminadoEn: null,
    canceladoEn: null,
    canceladoPor: null,
  };
}

export function aplicarAccion(
  viaje: Viaje,
  accion: Accion,
  ahora: number,
): Viaje {
  switch (accion.tipo) {
    case "ofertar":
      return ofertar(viaje, accion, ahora);
    case "retirar_oferta":
      return retirarOferta(viaje, accion.conductorId);
    case "aceptar_oferta":
      return aceptarOferta(viaje, accion, ahora);
    case "iniciar":
      if (viaje.estado !== "aceptado") return viaje;
      if (viaje.conductorId !== accion.conductorId) return viaje;
      return { ...viaje, estado: "en_curso", iniciadoEn: ahora };
    case "terminar":
      if (viaje.estado !== "en_curso") return viaje;
      if (viaje.conductorId !== accion.conductorId) return viaje;
      return { ...viaje, estado: "terminado", terminadoEn: ahora };
    case "cancelar":
      if (!puedeCancelar(viaje, accion.usuarioId)) return viaje;
      return {
        ...viaje,
        estado: "cancelado",
        canceladoEn: ahora,
        canceladoPor: accion.usuarioId,
        ofertas: viaje.ofertas.map((o) =>
          o.estado === "activa" ? { ...o, estado: "rechazada" } : o,
        ),
      };
    default:
      return viaje;
  }
}

/**
 * Un conductor tiene a lo sumo una oferta por viaje. Si vuelve a ofertar
 * (después de retirarla o para cambiar el precio), se actualiza la misma.
 */
function ofertar(
  viaje: Viaje,
  accion: Extract<Accion, { tipo: "ofertar" }>,
  ahora: number,
): Viaje {
  if (viaje.estado !== "solicitado") return viaje;
  if (accion.conductorId === viaje.estudianteId) return viaje;
  if (!precioValido(accion.precio)) return viaje;

  const existente = viaje.ofertas.find(
    (o) => o.conductorId === accion.conductorId,
  );
  if (existente) {
    return {
      ...viaje,
      ofertas: viaje.ofertas.map((o) =>
        o === existente
          ? { ...o, precio: accion.precio, estado: "activa", creadaEn: ahora }
          : o,
      ),
    };
  }

  if (viaje.ofertas.some((o) => o.id === accion.ofertaId)) return viaje;
  const nueva: Oferta = {
    id: accion.ofertaId,
    conductorId: accion.conductorId,
    precio: accion.precio,
    estado: "activa",
    creadaEn: ahora,
  };
  return { ...viaje, ofertas: [...viaje.ofertas, nueva] };
}

function retirarOferta(viaje: Viaje, conductorId: string): Viaje {
  if (viaje.estado !== "solicitado") return viaje;
  const existente = viaje.ofertas.find(
    (o) => o.conductorId === conductorId && o.estado === "activa",
  );
  if (!existente) return viaje;
  return {
    ...viaje,
    ofertas: viaje.ofertas.map((o) =>
      o === existente ? { ...o, estado: "retirada" } : o,
    ),
  };
}

function aceptarOferta(
  viaje: Viaje,
  accion: Extract<Accion, { tipo: "aceptar_oferta" }>,
  ahora: number,
): Viaje {
  if (viaje.estado !== "solicitado") return viaje;
  if (viaje.estudianteId !== accion.estudianteId) return viaje;
  const elegida = viaje.ofertas.find(
    (o) => o.id === accion.ofertaId && o.estado === "activa",
  );
  if (!elegida) return viaje;

  return {
    ...viaje,
    estado: "aceptado",
    conductorId: elegida.conductorId,
    precio: elegida.precio,
    aceptadoEn: ahora,
    ofertas: viaje.ofertas.map((o) => {
      if (o === elegida) return { ...o, estado: "aceptada" };
      if (o.estado === "activa") return { ...o, estado: "rechazada" };
      return o;
    }),
  };
}
