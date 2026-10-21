// Formato de datos para las pantallas. Funciones puras, con prueba.

/** 6500 → "$6.500" (pesos colombianos, punto como separador de miles). */
export function pesos(valor: number): string {
  const entero = Math.round(valor);
  const signo = entero < 0 ? "-" : "";
  const digitos = String(Math.abs(entero)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${signo}$${digitos}`;
}

/** "Ana María Rojas" → "AR" (primera letra del primer nombre y del último apellido). */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primera = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primera + ultima).toUpperCase();
}

/** "Ana María Rojas" → "Ana R." (como se muestra a la otra persona del viaje). */
export function nombreCorto(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "";
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[partes.length - 1][0].toUpperCase()}.`;
}

/** Calificación promedio: 4.9 → "4,9"; sin calificaciones → "Nuevo". */
export function calificacionTexto(promedio: number | null | undefined): string {
  if (promedio === null || promedio === undefined) return "Nuevo";
  return promedio.toFixed(1).replace(".", ",");
}

/** Hace cuánto pasó algo, con la hora que entra por parámetro (sin reloj propio). */
export function hace(desdeMs: number, ahoraMs: number): string {
  const minutos = Math.max(0, Math.floor((ahoraMs - desdeMs) / 60000));
  if (minutos < 1) return "ahora";
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas} h`;
  return `${Math.floor(horas / 24)} d`;
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/**
 * "2026-10-21T16:02:00Z" → "21 oct, 11:02 a. m." en hora de Colombia (UTC-5,
 * sin horario de verano). Se calcula a mano para que dé lo mismo en el
 * servidor y en cualquier navegador.
 */
export function fechaCorta(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const local = new Date(ms - 5 * 3600 * 1000);
  const hora24 = local.getUTCHours();
  const hora12 = hora24 % 12 === 0 ? 12 : hora24 % 12;
  const minutos = String(local.getUTCMinutes()).padStart(2, "0");
  return `${local.getUTCDate()} ${MESES[local.getUTCMonth()]}, ${hora12}:${minutos} ${hora24 < 12 ? "a. m." : "p. m."}`;
}

/** Cómo se llama cada estado del viaje en las pantallas. */
export function etiquetaEstado(estado: "solicitado" | "aceptado" | "en_curso" | "terminado" | "cancelado"): string {
  const etiquetas = {
    solicitado: "Buscando conductor",
    aceptado: "Conductor en camino",
    en_curso: "En viaje",
    terminado: "Terminado",
    cancelado: "Cancelado",
  };
  return etiquetas[estado];
}
