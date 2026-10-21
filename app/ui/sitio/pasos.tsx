// Los pasos de un viaje, dibujados como una ruta con paradas: es una
// secuencia real (docs/reglas.md), por eso van numerados.
const PASOS = [
  {
    titulo: "Pide tu viaje",
    texto: "Marca dónde te recogen y a dónde vas.",
  },
  {
    titulo: "Recibe ofertas",
    texto: "Los conductores disponibles te proponen su precio.",
  },
  {
    titulo: "Acepta una",
    texto: "Ves su nombre, su calificación y su vehículo. Su teléfono, solo mientras dura el viaje.",
  },
  {
    titulo: "Llega y califica",
    texto: "Al llegar a la universidad, los dos califican el viaje.",
  },
];

export function Pasos() {
  return (
    <section
      id="como-funciona"
      aria-labelledby="titulo-pasos"
      className="px-4 pt-28 sm:px-6 sm:pt-36"
    >
      <div className="mx-auto max-w-6xl">
        <h2
          id="titulo-pasos"
          className="max-w-2xl text-4xl font-bold tracking-[-0.035em] text-balance sm:text-6xl"
        >
          Así funciona un viaje
        </h2>

        <div className="relative mt-14">
          {/* La línea de la ruta que une las paradas. */}
          <div
            aria-hidden="true"
            className="absolute top-2 bottom-2 left-[1.15rem] w-0.5 bg-linear-to-b from-secundario to-primario md:top-[1.15rem] md:right-[calc(25%-2.375rem)] md:bottom-auto md:left-5 md:h-0.5 md:w-auto md:bg-linear-to-r"
          />
          <ol className="relative grid gap-10 md:grid-cols-4 md:gap-6">
          {PASOS.map((paso, k) => (
            <li key={paso.titulo} className="relative flex gap-5 md:flex-col md:gap-6">
              <span className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-secundario bg-fondo font-titulo font-bold text-secundario">
                {k + 1}
              </span>
              <div>
                <h3 className="text-xl tracking-tight">{paso.titulo}</h3>
                <p className="mt-2 max-w-xs leading-relaxed text-texto-suave">{paso.texto}</p>
              </div>
            </li>
          ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
