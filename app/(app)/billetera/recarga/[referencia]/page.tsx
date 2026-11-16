import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { miRecarga } from "@/app/lib/consultas-billetera";
import { fechaCorta, pesos } from "@/app/lib/formato";
import { perfilActual } from "@/app/lib/sesion";
import { esReferencia } from "@/app/lib/wompi";
import { EsperarRecarga } from "@/app/ui/comun/esperar-recarga";
import { CopiarReferencia } from "@/app/ui/comun/copiar-referencia";

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
      {recarga.requiere_revision ? <header role="status" className="space-y-3">
        <h1 className="cartel text-[2.75rem]">Estamos revisando tu recarga.</h1>
        <p className="text-texto-suave">La operación de {monto} requiere revisión del equipo. Conserva esta referencia para consultar lo ocurrido; no hagas otro pago por esta misma operación.</p>
        <Link href="/billetera/recargas" className={ENLACE}>Ver mis recargas</Link>
      </header> : recarga.estado === "pendiente" && (
        <>
          <header role="status">
            <h1 className="cartel text-[2.75rem]">Estamos confirmando tu pago.</h1>
            <p className="mt-3 text-lg leading-snug text-texto-suave">
              Esperamos la confirmación de Wompi para tu recarga de {monto}. El tiempo depende del medio de pago.
            </p>
          </header>
          <EsperarRecarga key={recarga.id} />
          <p className="text-sm text-texto-suave">
            Puedes salir de aquí: el saldo llega solo a tu billetera. Si no pagaste, no se te cobra nada y esta recarga se queda sin usar.
          </p>
          <Link href="/billetera" className={ENLACE}>
            Volver a mi billetera
          </Link>
        </>
      )}

      {!recarga.requiere_revision && recarga.estado === "aprobada" && (
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

      {!recarga.requiere_revision && recarga.estado === "rechazada" && (
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
      <section aria-label="Datos de la recarga" className="space-y-2 border-t border-dashed border-texto-suave/40 pt-4 text-sm">
        <p>Creada: {fechaCorta(recarga.creada_en)}</p>
        <p>Referencia: <span className="select-all break-all">{recarga.id}</span></p>
        {recarga.transaccion && <p>Transacción de Wompi: <span className="select-all break-all">{recarga.transaccion}</span></p>}
        <CopiarReferencia referencia={recarga.id} />
      </section>
    </main>
  );
}
