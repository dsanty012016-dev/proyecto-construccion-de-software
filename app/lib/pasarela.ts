import "server-only";
import { headers } from "next/headers";
import { ambienteDelEvento, ambienteWompi, secretoDelMismoAmbiente, type AmbienteWompi } from "./wompi";
import { crearClienteServidor } from "./supabase/server";

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

/** Las llaves válidas de Wompi, o null si no están completas o no coinciden. */
export function pasarela(): Pasarela | null {
  const llavePublica = process.env.WOMPI_LLAVE_PUBLICA;
  const secretoIntegridad = process.env.WOMPI_SECRETO_INTEGRIDAD;
  const ambiente = ambienteWompi(llavePublica);
  // Una llave de verdad con un secreto de pruebas (o al revés) es un error
  // de configuración: mejor no cobrar que cobrar mal.
  if (!ambiente || !llavePublica || !secretoIntegridad || !secretoDelMismoAmbiente(ambiente, secretoIntegridad)) return null;
  return { ambiente, llavePublica, secretoIntegridad };
}

/** Simulación expresa, Wompi de pruebas/real o recargas indisponibles. */
export type ModoDeRecarga = "prueba" | "wompi-pruebas" | "wompi" | "no-disponible";

export function modoDeRecarga(): ModoDeRecarga {
  const configurada = pasarela();
  if (configurada) return configurada.ambiente === "real" ? "wompi" : "wompi-pruebas";
  // Una configuración incompleta nunca se sustituye por dinero ficticio.
  if (process.env.WOMPI_LLAVE_PUBLICA || process.env.WOMPI_SECRETO_INTEGRIDAD) return "no-disponible";
  return process.env.UNIGO_RECARGA_SIMULADA === "true" ? "prueba" : "no-disponible";
}

export async function modoDeRecargaDisponible(): Promise<ModoDeRecarga> {
  const modo = modoDeRecarga();
  if (modo !== "wompi" && modo !== "wompi-pruebas") return modo;
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("checkout_wompi_disponible", {
    p_ambiente: ambienteDelEvento(modo === "wompi" ? "real" : "pruebas"),
  });
  return !error && data === true ? modo : "no-disponible";
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
