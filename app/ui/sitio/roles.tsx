import { IconoCarro, IconoPin, IconoReloj, IconoTarjeta } from "@/app/ui/comun/iconos";

// "Una app, dos maneras de moverte": una tarjeta grande por rol, con un
// pedacito de su pantalla de inicio (mockups de docs/diseno/).
export function Roles() {
  return (
    <section aria-labelledby="titulo-roles" className="px-4 pt-28 sm:px-6 sm:pt-36">
      <div className="mx-auto max-w-6xl">
        <h2
          id="titulo-roles"
          className="text-center text-4xl font-bold tracking-[-0.035em] text-balance sm:text-6xl"
        >
          Una app, dos maneras de moverte
        </h2>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <article className="flex flex-col overflow-hidden rounded-[2rem] bg-superficie">
            <div className="p-7 sm:p-9">
              <h3 className="text-2xl tracking-tight sm:text-3xl">Para estudiantes</h3>
              <p className="mt-3 max-w-sm leading-relaxed text-texto-suave">
                Pide tu viaje, compara las ofertas y acepta la que te parezca
                justa. Antes de subirte sabes quién te recoge y en qué vehículo.
              </p>
              <a
                href="#como-funciona"
                className="mt-5 inline-flex min-h-11 items-center font-semibold underline decoration-secundario/40 underline-offset-4 hover:decoration-secundario"
              >
                Cómo pedir un viaje
              </a>
            </div>

            {/* Accesos de la pantalla del estudiante. */}
            <div aria-hidden="true" className="mt-auto grid grid-cols-2 gap-3 px-7 pb-7 sm:px-9 sm:pb-9">
              <div className="rounded-2xl bg-primario p-4">
                <IconoCarro className="size-7" />
                <p className="mt-6 font-semibold">Solicitar viaje</p>
                <p className="text-sm text-texto">Viaja ahora</p>
              </div>
              {[
                { Icono: IconoReloj, titulo: "Mis viajes", texto: "Historial" },
                { Icono: IconoPin, titulo: "Favoritos", texto: "Lugares guardados" },
                { Icono: IconoTarjeta, titulo: "Pago", texto: "Métodos" },
              ].map(({ Icono, titulo, texto }) => (
                <div key={titulo} className="rounded-2xl border border-linea bg-fondo p-4">
                  <Icono className="size-7 text-secundario" />
                  <p className="mt-6 font-semibold">{titulo}</p>
                  <p className="text-sm text-texto-suave">{texto}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="flex flex-col overflow-hidden rounded-[2rem] bg-superficie">
            <div className="p-7 sm:p-9">
              <h3 className="text-2xl tracking-tight sm:text-3xl">Para conductores</h3>
              <p className="mt-3 max-w-sm leading-relaxed text-texto-suave">
                Si ya vas para la universidad en tu carro o tu moto, lleva a un
                compañero y pon tu propio precio.
              </p>
              <a
                href="#conducir"
                className="mt-5 inline-flex min-h-11 items-center font-semibold underline decoration-secundario/40 underline-offset-4 hover:decoration-secundario"
              >
                Cómo empezar a conducir
              </a>
            </div>

            {/* Gráfico de ingresos de la pantalla del conductor. Los valores
                son de ejemplo. */}
            <div aria-hidden="true" className="mt-auto px-7 pb-7 sm:px-9 sm:pb-9">
              <div className="rounded-2xl border border-linea bg-fondo p-5">
                <p className="text-sm text-texto-suave">Ingresos de la semana</p>
                <p className="mt-1 font-titulo text-3xl font-bold tracking-tight">$84.000</p>
                <div className="mt-5 flex h-28 gap-1">
                  {[
                    ["Lun", 55],
                    ["Mar", 30],
                    ["Mié", 70],
                    ["Jue", 100],
                    ["Vie", 80],
                    ["Sáb", 15],
                    ["Dom", 0],
                  ].map(([dia, valor]) => (
                    <div key={dia} className="flex h-full flex-1 flex-col items-center gap-1.5">
                      <div className="flex w-full flex-1 items-end justify-center">
                        <div
                          className={`w-2.5 rounded-full ${valor === 100 ? "bg-secundario" : "bg-primario"}`}
                          style={{ height: `${Math.max(Number(valor), 8)}%` }}
                        />
                      </div>
                      <span className="text-[0.7rem] text-texto-suave">{dia}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
