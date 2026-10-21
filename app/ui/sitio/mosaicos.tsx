import {
  IconoCheck,
  IconoCorreo,
  IconoEquis,
  IconoEstrella,
} from "@/app/ui/comun/iconos";

// Bloques grandes al estilo de una vitrina: cada uno cuenta una idea de UniGo
// con un pedazo de la app hecho en código (no son capturas). Los nombres y
// valores son de ejemplo; las reglas que muestran son las de docs/reglas.md.

const OFERTAS = [
  { inicial: "C", nombre: "Carlos R.", vehiculo: "Spark gris", nota: "4,9", precio: "$7.500" },
  { inicial: "D", nombre: "Diana M.", vehiculo: "NMAX negra", nota: "4,8", precio: "$6.000" },
  { inicial: "J", nombre: "Julián P.", vehiculo: "Picanto rojo", nota: "5,0", precio: "$8.000" },
];

function Titulo({ id, children, className = "" }: { id: string; children: React.ReactNode; className?: string }) {
  return (
    <h2
      id={id}
      className={`text-4xl font-bold tracking-[-0.035em] text-balance sm:text-6xl ${className}`}
    >
      {children}
    </h2>
  );
}

export function Mosaicos() {
  return (
    <div className="mt-28 space-y-4 px-4 sm:mt-36 sm:px-6">
      {/* Precio: el conductor propone y el estudiante escoge. */}
      <section
        aria-labelledby="titulo-ofertas"
        className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-superficie px-6 pt-14 text-center sm:pt-20"
      >
        <Titulo id="titulo-ofertas">Tú escoges la oferta.</Titulo>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-texto-suave text-pretty">
          Cada conductor te propone su precio. Comparas, miras su calificación
          y aceptas la que más te sirva.
        </p>

        <div
          aria-hidden="true"
          className="mx-auto mt-12 w-full max-w-sm translate-y-6 rounded-t-[2.75rem] border-x-[10px] border-t-[10px] border-fondo bg-fondo px-4 pt-6 pb-10 text-left shadow-[0_-24px_90px_-40px_var(--color-primario)]"
        >
          <div className="mx-auto mb-6 h-6 w-24 rounded-full bg-superficie" />
          <p className="text-sm text-texto-suave">Barrio La Esperanza a USTA</p>
          <p className="mt-1 font-titulo text-xl font-bold">3 ofertas para tu viaje</p>
          <ul className="mt-4 space-y-2.5">
            {OFERTAS.map((o, k) => (
              <li
                key={o.nombre}
                className={`flex items-center gap-3 rounded-2xl p-3 ${k === 0 ? "bg-primario" : "border border-linea bg-superficie"}`}
              >
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full font-titulo font-bold ${k === 0 ? "bg-texto text-fondo" : "bg-fondo"}`}
                >
                  {o.inicial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{o.nombre}</p>
                  <p className={`flex items-center gap-1 truncate text-xs ${k === 0 ? "text-texto" : "text-texto-suave"}`}>
                    <IconoEstrella className="size-3" />
                    {o.nota}, {o.vehiculo}
                  </p>
                </div>
                <p className="font-titulo text-lg font-bold tracking-tight">{o.precio}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Comunidad: solo correos de la universidad. Bloque claro. */}
      <section
        aria-labelledby="titulo-comunidad"
        className="zona-clara mx-auto max-w-6xl rounded-[2rem] bg-texto px-6 py-14 text-center text-fondo sm:py-20"
      >
        <Titulo id="titulo-comunidad">Solo gente de la USTA.</Titulo>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-tinta-suave text-pretty">
          Para crear tu cuenta necesitas tu correo institucional. Quien te
          lleva también estudia contigo.
        </p>

        <div aria-hidden="true" className="mx-auto mt-12 max-w-md space-y-3 text-left">
          <div className="flex items-center gap-3 rounded-2xl border-2 border-fondo bg-texto px-4 py-4 sm:px-5">
            <IconoCorreo className="size-5 shrink-0" />
            <span className="min-w-0 flex-1 truncate font-semibold">laura.gomez@ustavillavo.edu.co</span>
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primario text-texto">
              <IconoCheck className="size-4" />
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-tinta-suave/40 px-4 py-4 text-tinta-suave sm:px-5">
            <IconoCorreo className="size-5 shrink-0" />
            <span className="min-w-0 flex-1 truncate line-through decoration-1">laura.gomez@gmail.com</span>
            <IconoEquis className="size-5 shrink-0" />
          </div>
          <p className="px-1 text-sm text-tinta-suave">Solo se aceptan correos @ustavillavo.edu.co</p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
        {/* Disponibilidad del conductor. */}
        <section
          id="conducir"
          aria-labelledby="titulo-conducir"
          className="flex flex-col rounded-[2rem] bg-primario px-6 py-14 text-center sm:px-10"
        >
          <Titulo id="titulo-conducir" className="sm:text-5xl">
            Conduce cuando puedas.
          </Titulo>
          <p className="mx-auto mt-4 max-w-sm text-lg leading-relaxed text-texto text-pretty">
            Registra tu vehículo, activa “Estás disponible” y apágalo cuando
            entres a clase.
          </p>
          <div
            aria-hidden="true"
            className="mx-auto mt-10 flex w-full max-w-sm items-center gap-4 rounded-3xl bg-fondo p-5 text-left"
          >
            <div className="flex-1">
              <p className="font-semibold">Estás disponible</p>
              <p className="text-sm text-texto-suave">Recibirás solicitudes de viaje</p>
            </div>
            <span className="flex h-8 w-14 shrink-0 items-center justify-end rounded-full bg-primario p-1">
              <span className="size-6 rounded-full bg-texto" />
            </span>
          </div>
        </section>

        {/* Calificaciones. */}
        <section
          aria-labelledby="titulo-calificar"
          className="flex flex-col rounded-[2rem] bg-superficie px-6 py-14 text-center sm:px-10"
        >
          <Titulo id="titulo-calificar" className="sm:text-5xl">
            Cada viaje cuenta.
          </Titulo>
          <p className="mx-auto mt-4 max-w-sm text-lg leading-relaxed text-texto-suave text-pretty">
            Al llegar, los dos se califican de 1 a 5. La calificación de quien
            conduce aparece en cada oferta.
          </p>
          <div aria-hidden="true" className="mt-10">
            <p className="font-titulo text-7xl font-extrabold tracking-[-0.05em]">4,9</p>
            <div className="mt-3 flex justify-center gap-1 text-secundario">
              {[1, 2, 3, 4, 5].map((n) => (
                <IconoEstrella key={n} className="size-6" />
              ))}
            </div>
            <p className="mt-3 text-sm text-texto-suave">Carlos R., 38 viajes</p>
          </div>
        </section>
      </div>
    </div>
  );
}
