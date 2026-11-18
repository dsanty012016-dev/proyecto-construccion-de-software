import type { Metadata } from "next";
import Link from "next/link";
import { FALTAS_POR_PAGINA, historialDeFaltas } from "@/app/lib/consultas-billetera";
import {
  COBRO_CANCELACION_VIAJE,
  COBRO_CUPO_TARDE,
  diasDeSuspension,
  MINUTOS_CUPO_SIN_COBRO,
  STRIKES_PARA_SUSPENDER,
} from "@/app/lib/pagos";
import { paginaValida } from "@/app/lib/retiros";
import { perfilActual } from "@/app/lib/sesion";
import { EncabezadoPantalla } from "@/app/ui/comun/encabezado-pantalla";
import { EstadoCuenta } from "@/app/ui/comun/estado-cuenta";
import { EnlaceDeAyuda } from "@/app/ui/comun/ayuda-unigo";

export const metadata: Metadata = { title: "Mis faltas" };
const fechaDeFalta = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", dateStyle: "long" });

export default async function PaginaFaltas({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const { usuario } = await perfilActual();
  const pagina = paginaValida((await searchParams).pagina);
  const { faltas, total } = await historialDeFaltas(usuario.id, pagina);
  const enlace = "inline-flex min-h-11 items-center font-semibold text-secundario underline underline-offset-4";

  return (
    <main className="space-y-6 px-5 pt-6 pb-4">
      <EncabezadoPantalla titulo="Mis faltas" volverA="/perfil" />
      <EstadoCuenta personaId={usuario.id} enHistorial />

      <section aria-labelledby="historial-faltas" className="space-y-2">
        <h2 id="historial-faltas" className="text-lg">Historial de faltas</h2>
        {total === 0 ? (
          <p className="text-sm text-texto-suave">Todavía no tienes faltas registradas.</p>
        ) : faltas.length === 0 ? (
          <p className="text-sm text-texto-suave">Esta página quedó vacía. <Link className={enlace} href="/perfil/faltas">Volver al historial reciente</Link></p>
        ) : (
          <ul className="divide-y divide-texto-suave/20 border-y border-texto-suave/20">
            {faltas.map((falta) => (
              <li key={falta.id} className="space-y-1 py-3">
                <p className="font-semibold break-words">{falta.motivo}</p>
                <p className="text-sm text-texto-suave">
                  <time dateTime={falta.creado_en}>{fechaDeFalta.format(new Date(falta.creado_en))}</time>
                  {" · "}
                  {falta.vigente ? "Cuenta para una suspensión" : "Aplicada a una suspensión previa o actual"}
                </p>
                <EnlaceDeAyuda motivo={{ tipo: "falta", referencia: falta.id }} />
              </li>
            ))}
          </ul>
        )}
        {faltas.length > 0 && (pagina > 1 || pagina * FALTAS_POR_PAGINA < total) && (
          <nav aria-label="Páginas del historial de faltas" className="flex flex-wrap gap-x-6">
            {pagina > 1 && <Link className={enlace} href={`?pagina=${pagina - 1}`}>Faltas más recientes</Link>}
            {pagina * FALTAS_POR_PAGINA < total && <Link className={enlace} href={`?pagina=${pagina + 1}`}>Faltas más antiguas</Link>}
          </nav>
        )}
      </section>

      <section aria-labelledby="reglas-faltas" className="space-y-3 border-t border-dashed border-texto-suave/40 pt-4 text-sm leading-relaxed">
        <h2 id="reglas-faltas" className="text-lg">Cuándo se registra una falta</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Si cancelas un viaje cuando el conductor va en camino, se cobra el {COBRO_CANCELACION_VIAJE} % y se suma una falta. Si eliges cancelar y reportar un problema con el conductor, se devuelve el pago completo y no se suma una falta.</li>
          <li>Si dejas un puesto aprobado a menos de {MINUTOS_CUPO_SIN_COBRO} minutos de la salida, se suma una falta. Si ya pagaste, se cobra el {COBRO_CUPO_TARDE} %.</li>
          <li>Si conduces y cancelas un viaje aceptado o un cupo con puestos pagados, se suma una falta y los estudiantes recuperan su dinero. Esto también se aplica si el cupo con puestos pagados vence porque no saliste a tiempo.</li>
        </ul>
        <h3 className="pt-2 text-base">Cómo funciona la suspensión</h3>
        <p>La cuenta se suspende al acumular {STRIKES_PARA_SUSPENDER} faltas. La primera suspensión dura {diasDeSuspension(1)} días, la segunda {diasDeSuspension(2)}, la tercera {diasDeSuspension(3)} y las siguientes {diasDeSuspension(4)} días.</p>
        <p>Durante ese tiempo se bloquea pedir viajes, hacer ofertas, publicar cupos y pedir puestos. Las faltas que originaron la suspensión dejan de contar para la siguiente.</p>
      </section>
    </main>
  );
}
