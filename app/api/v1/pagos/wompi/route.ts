import { pareceEventoWompi } from "@/app/lib/wompi";
import { CuerpoExcesivo, leerJsonLimitado } from "@/supabase/functions/confirmar-pago/procesar";

// Aquí avisa Wompi cuando un pago cambia de estado (su "URL de eventos").
// La función privada de Supabase valida la firma y consulta a Wompi por ID
// antes de acreditar. La API pública no tiene permiso para sumar saldo.
// Wompi reintenta si no recibe un 200 (a los 30 minutos, 3 horas y 24 horas).

// Un aviso de Wompi pesa menos de 2 KB; nada legítimo se acerca a esto.
const TAMANO_MAXIMO = 20_000;

export async function POST(peticion: Request) {
  let evento: unknown;
  try {
    evento = await leerJsonLimitado(peticion, TAMANO_MAXIMO);
  } catch (error) {
    return responder(error instanceof CuerpoExcesivo ? 413 : 400);
  }
  if (!pareceEventoWompi(evento)) return responder(400);

  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!base) return responder(503);
    const destino = new URL("/functions/v1/confirmar-pago", base);
    const local = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(destino.hostname);
    if (destino.protocol !== "https:" && !local) return responder(503);
    const respuesta = await fetch(destino, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(evento), redirect: "error", signal: AbortSignal.timeout(20_000),
    });
    if (respuesta.status !== 200) return responder([400, 413, 429].includes(respuesta.status) ? respuesta.status : 503);
    const datos = await leerJsonLimitado(respuesta, 1000) as { recibido?: boolean };
    return responder(datos?.recibido === true ? 200 : 503);
  } catch {
    return responder(503);
  }
}

function responder(estado: number) {
  return Response.json({ recibido: estado === 200 }, { status: estado });
}
