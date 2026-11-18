import type { FilaMovimiento } from "@/app/lib/consultas-billetera";
import { fechaCorta, pesos } from "@/app/lib/formato";
import { EncabezadoPantalla } from "./encabezado-pantalla";
import { RutaViaje } from "./ruta-viaje";

interface Props {
  titulo: string;
  referencia: string;
  fecha: string;
  estado: string;
  origen: string;
  destino: string;
  movimientos: FilaMovimiento[];
  comision: number;
  volver: string;
}

const fechaCompleta = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota", dateStyle: "long", timeStyle: "short",
});

export function ComprobanteViaje({ titulo, referencia, fecha, estado, origen, destino, movimientos, comision, volver }: Props) {
  return (
    <main className="space-y-5 px-5 pt-6 pb-4">
      <EncabezadoPantalla titulo={titulo} volverA={volver} />
      <section aria-label="Datos del viaje" className="space-y-4 rounded-2xl bg-superficie p-4">
        <div>
          <p className="font-semibold">{estado}</p>
          <time className="text-sm text-texto-suave" dateTime={fecha}>{fechaCompleta.format(new Date(fecha))}</time>
        </div>
        <RutaViaje origen={origen} destino={destino} etiquetaOrigen="Origen" etiquetaDestino="Destino" />
        <p className="text-xs text-texto-suave">Referencia <span className="block break-all font-semibold">{referencia}</span></p>
      </section>
      <section aria-labelledby="movimientos-viaje" className="space-y-2">
        <h2 id="movimientos-viaje" className="text-lg">Movimientos de tu billetera</h2>
        {!movimientos.length ? (
          <p className="text-sm text-texto-suave">No hay movimientos registrados para este recorrido.</p>
        ) : (
          <ul className="divide-y divide-texto-suave/20 border-y border-texto-suave/20">
            {movimientos.map((m) => (
              <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-3">
                <div className="min-w-0 flex-1 basis-40">
                  <p className="font-semibold break-words">{m.descripcion}</p>
                  <time className="text-sm text-texto-suave" dateTime={m.creado_en}>{fechaCorta(m.creado_en)}</time>
                </div>
                <p className="font-bold tabular-nums">{m.monto > 0 ? "+" : "−"}{pesos(Math.abs(m.monto))}</p>
              </li>
            ))}
          </ul>
        )}
        {comision > 0 && <p className="text-sm text-texto-suave">Comisión descontada antes de acreditar tu ganancia: {pesos(comision)}.</p>}
      </section>
    </main>
  );
}
