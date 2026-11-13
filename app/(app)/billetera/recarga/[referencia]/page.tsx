import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { miRecarga } from "@/app/lib/consultas-billetera";
import { pesos } from "@/app/lib/formato";
import { perfilActual } from "@/app/lib/sesion";
import { esReferencia } from "@/app/lib/wompi";
import { EsperarRecarga } from "@/app/ui/comun/esperar-recarga";

export const metadata: Metadata = { title: "Tu recarga" };

// A esta pantalla vuelve la persona cuando termina de pagar en Wompi. Solo
// muestra en qué va la recarga: el saldo lo pone la base cuando Wompi avisa
// (app/api/v1/pagos/wompi), no esta página. Lo que Wompi agrega a la
// dirección (?id=...) no se usa ni se le cree.

const BOTON =
  "flex h-14 w-full items-center justify-center rounded-xl bg-primario prensa text-[17px] font-bold text-sobre-primario hover:bg-primario/85";
const ENLACE = "flex min-h-11 w-full items-center justify-center rounded-xl font-semibold text-texto-suave hover:text-texto";

export default async function PaginaRecarga({ params }: { params: Promise<{ referencia: string }> }) {
  const { referencia } = await params;
  if (!esReferencia(referencia)) notFound();
  await perfilActual();
  const recarga = await miRecarga(referencia);
  if (!recarga) notFound();
  const monto = pesos(recarga.monto);

  return (
    <main className="flex flex-col gap-6 px-5 pt-10">
      {recarga.estado === "pendiente" && (
        <>
          <EsperarRecarga />
          <header role="status">
            <h1 className="cartel text-[2.75rem]">Estamos confirmando tu pago.</h1>
            <p className="mt-3 text-lg leading-snug text-texto-suave">
              Wompi nos avisa apenas apruebe tu recarga de {monto}. Suele tardar menos de un minuto y esta pantalla se actualiza sola.
            </p>
          </header>
          <p className="text-sm text-texto-suave">
            Puedes salir de aquí: el saldo llega solo a tu billetera. Si no pagaste, no se te cobra nada y esta recarga se queda sin usar.
          </p>
          <Link href="/billetera" className={ENLACE}>
            Volver a mi billetera
          </Link>
        </>
      )}

      {recarga.estado === "aprobada" && (
        <>
          <header role="status">
            <h1 className="cartel text-[2.75rem]">Recarga lista.</h1>
            <p className="mt-3 text-lg leading-snug text-texto-suave">
              Ya tienes <strong className="text-texto">{monto}</strong> más en tu billetera.
            </p>
          </header>
          <Link href="/inicio" className={BOTON}>
            Ir al inicio
          </Link>
          <Link href="/billetera" className={ENLACE}>
            Ver mi billetera
          </Link>
        </>
      )}

      {recarga.estado === "rechazada" && (
        <>
          <header role="status">
            <h1 className="cartel text-[2.75rem]">El pago no se aprobó.</h1>
            <p className="mt-3 text-lg leading-snug text-texto-suave">
              Wompi no aprobó el pago de {monto}, así que tu billetera quedó igual. Puedes intentar de nuevo con otro medio de pago.
            </p>
          </header>
          <Link href="/billetera" className={BOTON}>
            Intentar de nuevo
          </Link>
        </>
      )}
    </main>
  );
}
