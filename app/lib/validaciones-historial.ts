import { z } from "zod";
import { ESTADOS, SIN_FILTRO, TIPOS, type Filtro } from "./historial";

// Lectura de los filtros de "Mis viajes" desde la URL (/viajes?tipo=cupo...).
// La URL la puede escribir cualquiera, así que nunca se confía en ella: lo
// desconocido, vacío o repetido (?tipo=a&tipo=b llega como lista) cuenta como
// "todos", y esta lectura nunca lanza error.

const esquemaFiltro = z
  .object({
    tipo: z.enum(TIPOS).catch("todos"),
    estado: z.enum(ESTADOS).catch("todos"),
    // Solo "1" activa el filtro; cualquier otra cosa ("talvez", "true", nada) no.
    pendientes: z
      .literal("1")
      .transform(() => true)
      .catch(false),
  })
  .catch(SIN_FILTRO);

/** Los parámetros de búsqueda tal como los entrega Next.js a la página. */
export type ParametrosUrl = Record<string, string | string[] | undefined>;

/** Convierte los parámetros de la URL en un filtro válido. */
export function leerFiltro(parametros: ParametrosUrl): Filtro {
  return esquemaFiltro.parse(parametros);
}
