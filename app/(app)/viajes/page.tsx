import type { Metadata } from "next";
import Link from "next/link";
import { gananciaConductor } from "@/app/lib/comision";
import type { CupoEnHistorial } from "@/app/lib/consultas-cupo";
import type { ItemHistorial } from "@/app/lib/consultas-viaje";
import { paginaDeViajes } from "@/app/lib/consultas-historial";
import { etiquetaEstado, fechaCorta, lugarCorto, nombreCorto, pesos } from "@/app/lib/formato";
import { enlaceDeFiltro } from "@/app/lib/historial";
import { paginaValida } from "@/app/lib/retiros";
import { recorridoDelPuesto } from "@/app/lib/sentido";
import { perfilActual } from "@/app/lib/sesion";
import { leerFiltro, type ParametrosUrl } from "@/app/lib/validaciones-historial";
import { FiltrosHistorial } from "@/app/ui/comun/filtros-historial";
import { EncabezadoPantalla } from "@/app/ui/comun/encabezado-pantalla";

export const metadata: Metadata = { title: "Mis viajes" };

const BOTON_CALIFICAR =
  "flex min-h-11 w-full items-center justify-center rounded-xl border border-texto-suave/30 text-sm font-semibold text-texto hover:bg-superficie";

// Historial de viajes por pedido y de cupos (terminados y cancelados), de
// los dos roles, del más reciente al más viejo. Desde aquí se califica lo que falte.
// Los filtros y la página se mantienen en la URL.
export default async function PaginaViajes({ searchParams }: { searchParams: Promise<ParametrosUrl> }) {
  const [{ usuario }, parametros] = await Promise.all([perfilActual(), searchParams]);
  const filtro = leerFiltro(parametros);
  const pagina = paginaValida(typeof parametros.pagina === "string" ? parametros.pagina : undefined);
  const { items, hayMas } = await paginaDeViajes(usuario.id, filtro, pagina);
  const url = enlaceDeFiltro(filtro, pagina);
  const volver = `?volver=${encodeURIComponent(url)}`;

  return (
    <main className="space-y-5 px-5 pt-6">
      <EncabezadoPantalla titulo="Mis viajes" texto="Viajes por pedido y cupos con hora fija, como estudiante y como conductor." />

      <FiltrosHistorial filtro={filtro} />
      {items.length === 0 ? (
        <div role="status" className="producto-panel space-y-2 p-4">
          <p className="font-semibold">
            {pagina > 1 ? "Esta página quedó vacía." : url === "/viajes" ? "Aún no tienes viajes en el historial." : "No hay viajes con estos filtros."}
          </p>
          {pagina > 1 ? (
            <Link href={enlaceDeFiltro(filtro)} className={BOTON_CALIFICAR}>Volver a la primera página</Link>
          ) : url !== "/viajes" && (
            <Link href="/viajes" className={BOTON_CALIFICAR}>Quitar los filtros</Link>
          )}
        </div>
      ) : (
        <ul key={url} className="movimiento-historial producto-panel px-4">
          {items.map((item) => item.tipo === "viaje"
            ? <FilaViaje key={`v-${item.dato.viaje.id}`} item={item.dato} detalle={`/viajes/${item.dato.viaje.id}${volver}`} />
            : <FilaCupo key={`c-${item.dato.cupo.id}`} item={item.dato} detalle={`/viajes/cupo/${item.dato.cupo.id}${volver}`} />)}
        </ul>
      )}
      {(pagina > 1 || hayMas) && (
        <nav aria-label="Páginas del historial" className="flex flex-wrap items-center gap-x-4 pb-5 text-sm">
          <span className="text-texto-suave">Página {pagina}</span>
          {pagina > 1 && <Link className="inline-flex min-h-11 items-center font-semibold text-secundario" href={enlaceDeFiltro(filtro, pagina - 1)}>Más recientes</Link>}
          {hayMas && <Link className="inline-flex min-h-11 items-center font-semibold text-secundario" href={enlaceDeFiltro(filtro, pagina + 1)}>Más antiguos</Link>}
        </nav>
      )}
    </main>
  );
}

function FilaViaje({ item, detalle }: { item: ItemHistorial; detalle: string }) {
  const { viaje, otraPersona, calificado } = item;
  return (
    <li className="space-y-2 border-b border-texto-suave/15 py-4 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[13px] text-texto-suave">{fechaCorta(viaje.terminado_en ?? viaje.cancelado_en ?? viaje.creado_en)}</p>
        <p className="producto-estado" data-estado={viaje.estado === "cancelado" ? "atencion" : undefined}>
          {viaje.vencio ? "Venció sin conductor" : etiquetaEstado(viaje.estado)}
        </p>
      </div>
      <Link href={detalle} className="flex min-h-11 items-center font-semibold text-secundario underline underline-offset-4">
        <span className="sr-only">Detalle del viaje a&nbsp;</span>
        {lugarCorto(viaje.destino_texto)}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-texto-suave">{otraPersona ? nombreCorto(otraPersona) : "Sin conductor"}</p>
        {viaje.precio !== null && viaje.estado === "terminado" && <p className="font-titulo font-bold tabular-nums">{pesos(viaje.precio)}</p>}
      </div>
      {viaje.estado === "terminado" &&
        (calificado ? (
          <p className="text-[13px] text-texto-suave">Ya calificaste este viaje.</p>
        ) : (
          <Link href={`/viajes/${viaje.id}/calificar`} className={BOTON_CALIFICAR}>
            Calificar
          </Link>
        ))}
    </li>
  );
}

function FilaCupo({ item, detalle }: { item: CupoEnHistorial; detalle: string }) {
  const { cupo, soyConductor, puesto, otros, porCalificar } = item;
  const terminado = cupo.estado === "terminado";
  const quien = otros.map(nombreCorto).filter(Boolean);
  const monto = soyConductor ? gananciaConductor(cupo.precio) * otros.length : (puesto?.pagado ?? 0);
  return (
    <li className="space-y-2 border-b border-texto-suave/15 py-4 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[13px] text-texto-suave">Cupo · sale {fechaCorta(cupo.sale_en)}</p>
        <p className={`text-[13px] font-semibold ${terminado ? "text-secundario" : "text-texto-suave"}`}>{terminado ? "Terminado" : cupo.vencio ? "No salió" : "Cancelado"}</p>
      </div>
      <Link href={detalle} className="flex min-h-11 items-center font-semibold text-secundario underline underline-offset-4">
        <span className="sr-only">Detalle del cupo a&nbsp;</span>
        {lugarCorto(soyConductor ? cupo.destino_texto : recorridoDelPuesto(cupo, puesto?.recogida_texto ?? null).destino)}
      </Link>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-texto-suave">
          {soyConductor
            ? quien.length > 0
              ? `Llevaste a ${quien.join(", ")}`
              : "Sin estudiantes"
            : quien[0]
              ? `Con ${quien[0]}`
              : "Conductor"}
        </p>
        {terminado && monto > 0 && (
          <p className="font-titulo font-bold tabular-nums">
            {soyConductor && <span className="sr-only">Recibiste </span>}
            {pesos(monto)}
          </p>
        )}
      </div>
      {terminado &&
        (porCalificar ? (
          <Link href={`/viajes/cupo/${cupo.id}/calificar`} className={BOTON_CALIFICAR}>
            {soyConductor && otros.length > 1 ? "Calificar a los estudiantes" : "Calificar"}
          </Link>
        ) : (
          quien.length > 0 && <p className="text-[13px] text-texto-suave">Ya calificaste este cupo.</p>
        ))}
    </li>
  );
}
