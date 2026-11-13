import "server-only";
import { headers } from "next/headers";
import { ambienteWompi, secretoDelMismoAmbiente, type AmbienteWompi } from "./wompi";

// La pasarela de pagos (Wompi) vista desde el servidor: si está configurada y
// con qué llaves. Las llaves se ponen como variables de entorno en Vercel
// (docs/pagos.md) y nunca llegan al navegador:
// - WOMPI_LLAVE_PUBLICA: la llave pública del comercio (pub_test_... o pub_prod_...).
// - WOMPI_SECRETO_INTEGRIDAD: el secreto con el que se firma cada pago.
// El secreto de EVENTOS no va aquí: vive en la base de datos, que es la que
// revisa los avisos de Wompi antes de dar saldo.

export interface Pasarela {
  ambiente: AmbienteWompi;
  llavePublica: string;
  secretoIntegridad: string;
}

/** Las llaves de Wompi, o null si no están (entonces la billetera sigue con la recarga de prueba). */
export function pasarela(): Pasarela | null {
  const llavePublica = process.env.WOMPI_LLAVE_PUBLICA;
  const secretoIntegridad = process.env.WOMPI_SECRETO_INTEGRIDAD;
  const ambiente = ambienteWompi(llavePublica);
  // Una llave de verdad con un secreto de pruebas (o al revés) es un error
  // de configuración: mejor no cobrar que cobrar mal.
  if (!ambiente || !llavePublica || !secretoIntegridad || !secretoDelMismoAmbiente(ambiente, secretoIntegridad)) return null;
  return { ambiente, llavePublica, secretoIntegridad };
}

/** Cómo se muestra la recarga: de prueba (sin pasarela), Wompi en pruebas o Wompi con dinero real. */
export type ModoDeRecarga = "prueba" | "wompi-pruebas" | "wompi";

export function modoDeRecarga(): ModoDeRecarga {
  const configurada = pasarela();
  if (!configurada) return "prueba";
  return configurada.ambiente === "real" ? "wompi" : "wompi-pruebas";
}

/**
 * Dirección pública de UniGo, para que Wompi sepa a dónde devolver a la
 * persona. En producción es la del proyecto en Vercel; en vistas previas y
 * en el computador, la de la petición.
 */
export async function origenDelSitio(): Promise<string> {
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  const cabeceras = await headers();
  const servidor = cabeceras.get("x-forwarded-host") ?? cabeceras.get("host") ?? "localhost:3000";
  const protocolo = cabeceras.get("x-forwarded-proto") ?? (servidor.startsWith("localhost") ? "http" : "https");
  return `${protocolo}://${servidor}`;
}
