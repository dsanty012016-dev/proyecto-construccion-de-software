import { IconoEstrella, IconoVehiculo } from "@/app/ui/comun/iconos-app";
import { AIRE, SECCION, TITULO_SECCION } from "./estilos";

// "De tu barrio a la U, en cuatro paradas": la misma línea punteada de la app
// recorre la sección y el carrito baja con la página (position: sticky, sin
// JavaScript). Cada parada trae un pedazo de la app con datos de ejemplo.

const TARJETA = "w-full max-w-[420px] min-w-0 flex-[1_1_19rem] rounded-[22px] bg-superficie";

function Parada({
  numero,
  titulo,
  texto,
  children,
}: {
  numero: number;
  titulo: string;
  texto: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-14 gap-y-7">
      <div className="max-w-[460px] min-w-0 flex-[1_1_20rem]">
        <p className="font-titulo text-[15px] font-bold text-secundario">Parada {numero}</p>
        <h3 className="mt-1.5 text-[clamp(1.6rem,2.6vw,2.1rem)] tracking-[-0.02em]">{titulo}</h3>
        <p className="mt-3 text-[17px] leading-relaxed text-texto-suave">{texto}</p>
      </div>
      <div aria-hidden="true" className={TARJETA}>
        {children}
      </div>
    </li>
  );
}

export function Paradas() {
  return (
    <section id="como-funciona" aria-labelledby="titulo-ruta" className={`${SECCION} ${AIRE}`}>
      <h2 id="titulo-ruta" className={`max-w-[16ch] ${TITULO_SECCION}`}>
        De tu barrio a la U, en cuatro paradas.
      </h2>

      <div className="relative mt-[clamp(2.5rem,5vw,4rem)] pl-11">
        {/* La línea del viaje y el carro que baja con la página. */}
        <div aria-hidden="true" className="absolute inset-y-0 left-0 w-[30px]">
          <span className="absolute inset-y-2 left-[13px] w-[3px] bg-[repeating-linear-gradient(var(--color-secundario)_0_6px,transparent_6px_14px)]" />
          <span className="sticky top-[45vh] flex size-[30px] items-center justify-center rounded-full bg-texto text-fondo shadow-lg">
            <IconoVehiculo className="size-4" />
          </span>
        </div>

        <ol className="flex flex-col gap-[clamp(3rem,6vw,5rem)]">
          <Parada numero={1} titulo="Pides tu viaje" texto="Marcas en el mapa dónde te recogen. A tu sede, o de la U de vuelta a casa.">
            <div className="grid grid-cols-[20px_minmax(0,1fr)] gap-x-3.5 p-5">
              <span className="flex flex-col items-center pt-1.5">
                <span className="size-3 rounded-full border-2 border-texto bg-primario" />
                <span className="my-1 w-0.5 flex-1 bg-[repeating-linear-gradient(var(--color-secundario)_0_4px,transparent_4px_9px)]" />
                <span className="size-3 rounded-[3px] bg-texto" />
              </span>
              <span className="flex flex-col gap-4">
                <span>
                  <span className="block text-[13px] text-texto-suave">Te recogen en</span>
                  <span className="block font-bold">Barzal Alto · Cra 33 #41-20</span>
                </span>
                <span>
                  <span className="block text-[13px] text-texto-suave">Vas a</span>
                  <span className="block font-bold">U. Santo Tomás, Villavicencio</span>
                </span>
              </span>
            </div>
          </Parada>

          <Parada
            numero={2}
            titulo="Eliges la oferta"
            texto="Cada conductor te propone su precio. Antes de aceptar ves su calificación, su carro y su placa."
          >
            <div className="px-5 py-2">
              <div className="flex items-center gap-3 border-b border-texto-suave/15 py-3">
                <span className="flex-1">
                  <span className="block font-bold">Andrés R.</span>
                  <span className="flex items-center gap-1 text-[13px] text-texto-suave">
                    <IconoEstrella llena className="size-3.5 text-secundario" />
                    4,9 · 38 viajes
                  </span>
                </span>
                <span className="font-titulo text-xl font-bold tabular-nums">$7.000</span>
              </div>
              <div className="flex items-center gap-3 py-3">
                <span className="flex-1">
                  <span className="block font-bold">Valentina C.</span>
                  <span className="block text-[13px] text-texto-suave">Nueva en UniGo</span>
                </span>
                <span className="font-titulo text-xl font-bold tabular-nums">$7.500</span>
              </div>
            </div>
          </Parada>

          <Parada
            numero={3}
            titulo="Lo ves llegar"
            texto="El conductor aparece moviéndose en el mapa. Si quieres, compartes el viaje en vivo con alguien de confianza."
          >
            <div className="flex flex-col gap-3.5 p-5">
              <span className="font-titulo text-[22px] font-bold tracking-tight">Andrés va por ti</span>
              <span className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-texto-suave">Busca la placa</span>
                <span className="rounded-lg bg-texto px-3 py-1 font-titulo text-[22px] font-bold tracking-[0.08em] text-fondo">KDS 482</span>
              </span>
              <span className="flex h-11 items-center justify-center rounded-xl border border-texto-suave/30 font-titulo font-semibold">
                Compartir viaje
              </span>
            </div>
          </Parada>

          <Parada numero={4} titulo="Llegas a clase" texto="Al llegar, el conductor recibe el pago y los dos se califican.">
            <div className="flex flex-col gap-3 p-5">
              <span className="font-bold">¿Cómo te fue con Andrés?</span>
              <span className="flex gap-1.5 text-secundario">
                {[1, 2, 3, 4, 5].map((n) => (
                  <IconoEstrella key={n} llena className="size-7" />
                ))}
              </span>
              <span className="text-[13px] text-texto-suave">Viaje pagado · $7.000</span>
            </div>
          </Parada>
        </ol>
      </div>
    </section>
  );
}
