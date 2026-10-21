import { IconoEstrella, IconoReloj } from "@/app/ui/comun/iconos";
import { EscenaRuta } from "./escena-ruta";
import { MapaRespaldo } from "./mapa-respaldo";

// Primera pantalla: el lema grande, las dos acciones y el mapa de la ruta a la
// universidad (SVG al instante; 3D encima cuando el navegador puede).
export function Portada() {
  return (
    <section aria-labelledby="titulo-portada" className="px-4 pt-14 sm:px-6 sm:pt-20">
      <div className="mx-auto max-w-4xl text-center">
        <h1
          id="titulo-portada"
          className="text-[clamp(2.75rem,9vw,6.5rem)] leading-[0.95] font-extrabold tracking-[-0.045em] text-balance"
        >
          Tu viaje, tu universidad.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-texto-suave text-pretty sm:text-xl">
          Pide un viaje a la USTA y escoge entre las ofertas de conductores que
          también estudian allí.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#unete"
            className="flex min-h-12 w-full items-center justify-center rounded-full bg-primario px-7 font-semibold text-texto transition-colors hover:bg-primario/85 sm:w-auto"
          >
            Únete a UniGo
          </a>
          <a
            href="#como-funciona"
            className="flex min-h-12 w-full items-center justify-center rounded-full border border-linea px-7 font-semibold text-texto transition-colors hover:border-texto-suave sm:w-auto"
          >
            Ver cómo funciona
          </a>
        </div>
      </div>

      <div className="relative mx-auto mt-14 aspect-[2/3] max-w-6xl overflow-hidden rounded-[2rem] border border-linea bg-fondo sm:mt-16 sm:aspect-[16/9]">
        <MapaRespaldo />
        <EscenaRuta />

        {/* Fragmentos de la app sobre el mapa. Son ilustración: lo que dicen se
            explica en las secciones de abajo. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-24 bg-linear-to-b from-fondo to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-fondo to-transparent" />

          <div className="absolute top-4 left-4 flex items-center gap-3 rounded-2xl border border-linea bg-superficie/90 px-4 py-3 backdrop-blur sm:top-8 sm:left-8">
            <IconoReloj className="size-5 text-secundario" />
            <div>
              <p className="text-sm font-semibold">USTA Villavicencio</p>
              <p className="text-xs text-texto-suave">8 min, 2,4 km</p>
            </div>
          </div>

          <div className="absolute inset-x-4 bottom-4 rounded-3xl border border-linea bg-superficie/95 p-4 backdrop-blur sm:inset-x-auto sm:right-8 sm:bottom-8 sm:w-[22rem] sm:p-5">
            <p className="text-xs text-texto-suave">Nueva oferta para tu viaje</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primario font-titulo font-bold">
                C
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">Carlos R.</p>
                <p className="flex items-center gap-1 truncate text-sm text-texto-suave">
                  <IconoEstrella className="size-3.5 text-secundario" />
                  4,9 en 38 viajes
                </p>
              </div>
              <p className="font-titulo text-2xl font-bold tracking-tight">$7.500</p>
            </div>
            <div className="mt-4 flex gap-2">
              <span className="flex h-11 flex-1 items-center justify-center rounded-full bg-primario text-sm font-semibold">
                Aceptar
              </span>
              <span className="flex h-11 flex-1 items-center justify-center rounded-full border border-linea text-sm font-semibold text-texto-suave">
                Ver más ofertas
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
