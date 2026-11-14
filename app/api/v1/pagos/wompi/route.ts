import { crearClienteServidor } from "@/app/lib/supabase/server";
import type { Json } from "@/app/lib/supabase/tipos";
import { pareceEventoWompi } from "@/app/lib/wompi";

// Aquí avisa Wompi cuando un pago cambia de estado (su "URL de eventos").
// Esta ruta no decide nada: le pasa el aviso tal cual a la base de datos, que
// revisa la firma con el secreto de eventos y, si el pago fue aprobado, pone
// el saldo (confirmar_recarga_wompi, migración 023). Por eso no importa que
// cualquiera pueda llamarla: sin un aviso firmado por Wompi no pasa nada.
// Wompi reintenta si no recibe un 200 (a los 30 minutos, 3 horas y 24 horas).

// Un aviso de Wompi pesa menos de 2 KB; nada legítimo se acerca a esto.
const TAMANO_MAXIMO = 20_000;

export async function POST(peticion: Request) {
  const texto = await peticion.text();
  if (texto.length > TAMANO_MAXIMO) return responder(413);

  let evento: unknown;
  try {
    evento = JSON.parse(texto);
  } catch {
    return responder(400);
  }
  if (!pareceEventoWompi(evento)) return responder(400);

  const supabase = await crearClienteServidor();
  const { data: resultado, error } = await supabase.rpc("confirmar_recarga_wompi", { p_evento: evento as Json });
  if (error) {
    // P0001: la base lo rechazó a propósito (firma inválida o pasarela sin
    // configurar). Cualquier otro código es un fallo nuestro: Wompi reintenta.
    console.error("Aviso de Wompi sin procesar:", error.message);
    return responder(error.code === "P0001" ? 400 : 500);
  }
  if (resultado === "monto_distinto") console.error("Wompi aprobó un pago por un monto distinto al de la recarga.");
  return responder(200);
}

function responder(estado: number) {
  return Response.json({ recibido: estado === 200 }, { status: estado });
}
