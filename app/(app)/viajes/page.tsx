import type { Metadata } from "next";
import Link from "next/link";
import { gananciaConductor } from "@/app/lib/comision";
import { historialDeCupos, type CupoEnHistorial } from "@/app/lib/consultas-cupo";
import { historialDeViajes } from "@/app/lib/consultas-viaje";
import { etiquetaEstado, fechaCorta, nombreCorto, pesos } from "@/app/lib/formato";
import { perfilActual } from "@/app/lib/sesion";

export const metadata: Metadata = { title: "Mis viajes" };

type ItemViaje = Awaited<ReturnType<typeof historialDeViajes>>[number];
type Item = { tipo: "viaje"; fecha: number; dato: ItemViaje } | { tipo: "cupo"; fecha: number; dato: CupoEnHistorial };

const BOTON_CALIFICAR =
  "flex min-h-11 w-full items-center justify-center rounded-xl border border-texto-suave/30 text-sm font-semibold text-texto hover:bg-superficie";

// Historial de viajes por pedido y de cupos (terminados y cancelados), de
// los dos roles, del más reciente al más viejo. Desde aquí se califica lo que falte.
export default async function PaginaViajes() {
  const { usuario } = await perfilActual();
  const [viajes, cupos] = await Promise.all([historialDeViajes(usuario.id), historialDeCupos(usuario.id)]);
  const items: Item[] = [
    ...viajes.map((v) => ({
      tipo: "viaje" as const,
      fecha: Date.parse(v.viaje.terminado_en ?? v.viaje.cancelado_en ?? v.viaje.creado_en),
      dato: v,
    })),
    ...cupos.map((c) => ({ tipo: "cupo" as const, fecha: Date.parse(c.cupo.sale_en), dato: c })),
  ].sort((a, b) => b.fecha - a.fecha);

  return (
    <main className="space-y-5 px-5 pt-6">
      <header>
        <h1 className="text-3xl tracking-tight">Mis viajes</h1>
        <p className="text-sm text-texto-suave">Viajes por pedido y cupos con hora fija, como estudiante y como conductor.</p>
      </header>

      {items.length === 0 ? (
        <p role="status" className="text-texto-suave">
          Aún no tienes viajes terminados. Cuando llegues a la U, aparecen aquí para calificarlos.
        </p>
      ) : (
        <ul>
          {items.map((item) =>
            item.tipo === "viaje" ? <FilaViaje key={`v-${item.dato.viaje.id}`} item={item.dato} /> : <FilaCupo key={`c-${item.dato.cupo.id}`} item={item.dato} />,
          )}
        </ul>
      )}
    </main>
  );
}

function FilaViaje({ item }: { item: ItemViaje }) {
  const { viaje, otraPersona, calificado } = item;
  return (
    <li className="space-y-2 border-b border-texto-suave/15 py-4 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] text-texto-suave">{fechaCorta(viaje.terminado_en ?? viaje.cancelado_en ?? viaje.creado_en)}</p>
        <p className={`text-[13px] font-semibold ${viaje.estado === "cancelado" ? "text-texto-suave" : "text-secundario"}`}>{etiquetaEstado(viaje.estado)}</p>
      </div>
      <p className="font-semibold">
        {viaje.origen_texto} → {viaje.destino_texto}
      </p>
      <div className="flex items-center justify-between gap-3">
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

function FilaCupo({ item }: { item: CupoEnHistorial }) {
  const { cupo, soyConductor, puesto, otros, porCalificar } = item;
  const terminado = cupo.estado === "terminado";
  const quien = otros.map(nombreCorto).filter(Boolean);
  const monto = soyConductor ? gananciaConductor(cupo.precio) * otros.length : (puesto?.pagado ?? 0);
  return (
    <li className="space-y-2 border-b border-texto-suave/15 py-4 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] text-texto-suave">Cupo · sale {fechaCorta(cupo.sale_en)}</p>
        <p className={`text-[13px] font-semibold ${terminado ? "text-secundario" : "text-texto-suave"}`}>{terminado ? "Terminado" : "Cancelado"}</p>
      </div>
      <p className="font-semibold">
        {soyConductor ? cupo.salida_texto : (puesto?.recogida_texto ?? cupo.salida_texto)} → {cupo.destino_texto}
      </p>
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
