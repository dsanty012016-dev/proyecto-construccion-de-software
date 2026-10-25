import { MINUTOS_LIMITE_PAGO } from "@/app/lib/pagos";
import { AIRE, SECCION, TITULO_SECCION } from "./estilos";

// Cupos con hora fija, mostrados como el tablero de salidas de la app
// (datos de ejemplo).

const SALIDAS = [
  { hora: "6:30", quien: "Andrés R.", desde: "Desde La Esperanza", libres: 2, puestos: 4, precio: "$5.000" },
  { hora: "6:45", quien: "Laura M.", desde: "Desde El Buque", libres: 3, puestos: 4, precio: "$4.500" },
  { hora: "7:10", quien: "Camilo P.", desde: "Sin puestos libres", libres: 0, puestos: 1, precio: null },
];

export function Salidas() {
  return (
    <section aria-labelledby="titulo-cupos" className={`${SECCION} ${AIRE} flex flex-wrap items-center gap-x-[4.5rem] gap-y-10`}>
      <div className="min-w-0 flex-[1_1_24rem]">
        <h2 id="titulo-cupos" className={TITULO_SECCION}>
          ¿Vas con tiempo? Súbete en el camino.
        </h2>
        <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-texto-suave">
          Hay conductores que publican a qué hora salen hacia la U. Pides tu puesto desde un punto de su recorrido, él lo aprueba y pagas
          hasta {MINUTOS_LIMITE_PAGO} minutos antes de salir.
        </p>
      </div>
      <div aria-hidden="true" className="w-full max-w-[520px] min-w-0 flex-[1_1_24rem] rounded-3xl border border-texto-suave/20 px-[22px] py-2">
        <p className="mt-3.5 mb-1 text-xs font-bold text-texto-suave">Mañana · salidas hacia la U</p>
        {SALIDAS.map((s) => (
          <div
            key={s.hora}
            className={`grid grid-cols-[84px_minmax(0,1fr)_auto] items-start gap-x-3.5 border-b border-texto-suave/15 py-4 last:border-b-0 ${s.libres === 0 ? "text-texto-suave" : ""}`}
          >
            <span className="font-titulo text-[30px] leading-none font-extrabold tracking-[-0.03em] tabular-nums">
              {s.hora}
              <span className="mt-1 block font-texto text-xs font-semibold tracking-normal text-texto-suave">a. m.</span>
            </span>
            <span>
              <span className="block font-bold">{s.quien}</span>
              <span className="block text-[13px] text-texto-suave">{s.desde}</span>
              {s.libres > 0 && (
                <span className="mt-1.5 flex gap-1">
                  {Array.from({ length: s.puestos }, (_, i) => (
                    <span key={i} className={`size-2.5 rounded-full ${i < s.libres ? "bg-secundario" : "border-[1.5px] border-texto-suave"}`} />
                  ))}
                </span>
              )}
            </span>
            <span className="text-right font-titulo font-bold tabular-nums">
              {s.precio ?? "Lleno"}
              {s.precio && <span className="block font-texto text-xs font-semibold text-texto-suave">puesto</span>}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
