// Quiénes hacen UniGo (datos de la landing original del equipo).
const INTEGRANTES = [
  { nombre: "Dilan Santiago Chavarro Parra", rol: "Desarrollo, diseño de la experiencia y gestión del proyecto" },
  { nombre: "David Eduardo Durán Acevedo", rol: "Desarrollo, gestión del proyecto y pruebas" },
];

function iniciales(nombre: string) {
  const partes = nombre.split(" ");
  return `${partes[0][0]}${partes[2]?.[0] ?? partes[1][0]}`;
}

export function Equipo() {
  return (
    <section id="equipo" aria-labelledby="titulo-equipo" className="px-4 pt-28 sm:px-6 sm:pt-36">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-end">
        <div>
          <h2
            id="titulo-equipo"
            className="text-4xl font-bold tracking-[-0.035em] text-balance sm:text-6xl"
          >
            De estudiantes para estudiantes
          </h2>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-texto-suave text-pretty">
            UniGo es un proyecto académico de estudiantes de la Universidad
            Santo Tomás, seccional Villavicencio, que también necesitan llegar
            a clase a tiempo.
          </p>
        </div>

        <ul className="grid gap-3">
          {INTEGRANTES.map((persona) => (
            <li key={persona.nombre} className="flex items-center gap-4 rounded-3xl border border-linea p-5">
              <span
                aria-hidden="true"
                className="flex size-14 shrink-0 items-center justify-center rounded-full bg-superficie font-titulo text-lg font-bold text-secundario"
              >
                {iniciales(persona.nombre)}
              </span>
              <div>
                <p className="font-semibold">{persona.nombre}</p>
                <p className="mt-0.5 text-sm text-texto-suave">{persona.rol}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
