// Puente de confianza: primero la firma, después la transacción obtenida
// del proveedor y, por último, la acreditación privada de la base.
export class EventoInvalido extends Error {}
export class CuerpoExcesivo extends Error {}

export async function leerJsonLimitado(peticion: Request | Response, maximo = 20_000): Promise<unknown> {
  const lector = peticion.body?.getReader();
  if (!lector) throw new EventoInvalido();
  const partes: Uint8Array[] = [];
  let tamano = 0;
  try {
    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;
      tamano += value.byteLength;
      if (tamano > maximo) { await lector.cancel(); throw new CuerpoExcesivo(); }
      partes.push(value);
    }
  } finally { lector.releaseLock(); }
  const cuerpo = new Uint8Array(tamano);
  let indice = 0;
  for (const parte of partes) { cuerpo.set(parte, indice); indice += parte.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(cuerpo)); }
  catch { throw new EventoInvalido(); }
}

type Aviso = { transaccion: string; ambiente: "test" | "prod" };
export interface TransaccionVerificada {
  id: string;
  reference: string;
  status: "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR";
  amount_in_cents: number;
  currency: string;
  payment_method_type?: string;
}

function esTransaccion(valor: unknown): valor is TransaccionVerificada {
  if (!valor || typeof valor !== "object") return false;
  const v = valor as Record<string, unknown>;
  return typeof v.id === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(v.id)
    && typeof v.reference === "string" && v.reference.length <= 200
    && typeof v.status === "string" && ["PENDING", "APPROVED", "DECLINED", "VOIDED", "ERROR"].includes(v.status)
    && Number.isSafeInteger(v.amount_in_cents) && Number(v.amount_in_cents) >= 0
    && typeof v.currency === "string"
    && (v.payment_method_type === undefined || typeof v.payment_method_type === "string");
}

export function manejadorDePagos(dependencias: {
  validar: (evento: unknown) => Promise<Aviso | null>;
  confirmar: (evento: unknown, transaccion: TransaccionVerificada) => Promise<string>;
  llavePrivada: () => string | undefined;
  consultar?: typeof fetch;
}) {
  const consultar = dependencias.consultar ?? fetch;
  return async (peticion: Request): Promise<Response> => {
    if (peticion.method !== "POST") return Response.json({ recibido: false }, { status: 405, headers: { Allow: "POST" } });
    try {
      const evento = await leerJsonLimitado(peticion);
      const aviso = await dependencias.validar(evento);
      if (!aviso) return Response.json({ recibido: true });
      if (!["test", "prod"].includes(aviso.ambiente) || !/^[A-Za-z0-9_-]{1,100}$/.test(aviso.transaccion)) throw new EventoInvalido();
      const llave = dependencias.llavePrivada();
      if (!llave?.startsWith(aviso.ambiente === "prod" ? "prv_prod_" : "prv_test_")) throw new Error("Configuración incompleta");
      // El host es fijo; ni el evento ni la referencia pueden escoger otra URL.
      const servidor = aviso.ambiente === "prod" ? "production" : "sandbox";
      const respuesta = await consultar(`https://${servidor}.wompi.co/v1/transactions/${encodeURIComponent(aviso.transaccion)}`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${llave}` },
        redirect: "error", signal: AbortSignal.timeout(10_000),
      });
      if (!respuesta.ok) throw new Error("Proveedor no disponible");
      let datos: { data?: unknown };
      try { datos = await leerJsonLimitado(respuesta, 100_000) as { data?: unknown }; }
      catch { throw new Error("Respuesta no válida del proveedor"); }
      if (!datos || !esTransaccion(datos.data) || datos.data.id !== aviso.transaccion) throw new Error("Respuesta no válida");
      // Solo se pasa la información necesaria; no se guardan datos del pagador.
      const { id, reference, status, amount_in_cents, currency, payment_method_type } = datos.data;
      await dependencias.confirmar(evento, { id, reference, status, amount_in_cents, currency, payment_method_type });
      return Response.json({ recibido: true });
    } catch (error) {
      const estado = error instanceof CuerpoExcesivo ? 413 : error instanceof EventoInvalido ? 400 : 503;
      // Los errores internos no incluyen cuerpos del proveedor, llaves ni SQL.
      return Response.json({ recibido: false }, { status: estado });
    }
  };
}
