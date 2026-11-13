import { createHash } from "node:crypto";
import { z } from "zod";

// Lo que UniGo necesita saber de Wompi (la pasarela de pagos), como funciones
// puras: en qué ambiente está una llave, cómo se firma un pago y cómo se arma
// la dirección de la página de pago. Pruebas en wompi.test.ts.
// Aquí NO se revisa la firma de los avisos de Wompi: eso lo hace la base de
// datos (confirmar_recarga_wompi, migración 023), que es la que da el saldo.

/** Todo se cobra en pesos colombianos. */
export const MONEDA = "COP";

/** Página de pago de Wompi (Web Checkout). */
const CHECKOUT = "https://checkout.wompi.co/p/";

export type AmbienteWompi = "pruebas" | "real";

/** Las llaves de Wompi dicen en su nombre si son de pruebas o de verdad. */
export function ambienteWompi(llavePublica: string | undefined): AmbienteWompi | null {
  if (llavePublica?.startsWith("pub_test_")) return "pruebas";
  if (llavePublica?.startsWith("pub_prod_")) return "real";
  return null;
}

/** ¿El secreto de integridad es del mismo ambiente que la llave pública? */
export function secretoDelMismoAmbiente(ambiente: AmbienteWompi, secretoIntegridad: string | undefined): boolean {
  return Boolean(secretoIntegridad?.startsWith(ambiente === "pruebas" ? "test_integrity_" : "prod_integrity_"));
}

/**
 * Firma de integridad: con ella Wompi comprueba que nadie cambió el monto ni
 * la referencia en el camino. Es el SHA-256 de referencia + centavos + moneda
 * + secreto, pegados sin separador.
 */
export function firmaDeIntegridad(referencia: string, centavos: number, secreto: string, moneda: string = MONEDA): string {
  return createHash("sha256").update(`${referencia}${centavos}${moneda}${secreto}`).digest("hex");
}

export interface PagoWompi {
  llavePublica: string;
  secretoIntegridad: string;
  /** La referencia es el id de la recarga (un uuid). */
  referencia: string;
  /** En pesos. */
  monto: number;
  /** A dónde vuelve la persona al terminar de pagar. */
  volverA: string;
}

/** Dirección de la página de Wompi donde se paga esta recarga. */
export function urlDeCheckout({ llavePublica, secretoIntegridad, referencia, monto, volverA }: PagoWompi): string {
  const centavos = monto * 100;
  const url = new URL(CHECKOUT);
  url.searchParams.set("public-key", llavePublica);
  url.searchParams.set("currency", MONEDA);
  url.searchParams.set("amount-in-cents", String(centavos));
  url.searchParams.set("reference", referencia);
  url.searchParams.set("signature:integrity", firmaDeIntegridad(referencia, centavos, secretoIntegridad));
  url.searchParams.set("redirect-url", volverA);
  return url.toString();
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** ¿El texto tiene forma de referencia de recarga? (Llega en la URL: no se confía.) */
export function esReferencia(texto: string): boolean {
  return UUID.test(texto);
}

/**
 * La forma mínima de un aviso de Wompi. Solo sirve para descartar basura
 * antes de pasarlo a la base; lo demás (firma, monto, referencia) lo revisa ella.
 */
const esquemaEvento = z.looseObject({
  event: z.string().min(1).max(60),
  data: z.record(z.string(), z.unknown()),
  signature: z.looseObject({
    checksum: z.string().min(1).max(128),
    properties: z.array(z.string().min(1).max(80)).min(1).max(20),
  }),
  timestamp: z.number().int(),
});

export function pareceEventoWompi(valor: unknown): boolean {
  return esquemaEvento.safeParse(valor).success;
}
