import {
  IconoCarro,
  IconoCorreo,
  IconoEstrella,
  IconoTelefono,
} from "@/app/ui/comun/iconos";

// Garantías de seguridad. Cada una existe de verdad en la base de datos
// (supabase/migraciones): si cambia una regla, hay que cambiar este texto.
const GARANTIAS = [
  {
    Icono: IconoCorreo,
    titulo: "Solo correos institucionales",
    texto: "Nadie de fuera de la universidad puede crear una cuenta.",
  },
  {
    Icono: IconoCarro,
    titulo: "Vehículo registrado",
    texto: "Ves la placa, la marca y el color antes de aceptar.",
  },
  {
    Icono: IconoTelefono,
    titulo: "Tu número no queda expuesto",
    texto: "Solo lo ve la persona de tu viaje, y solo mientras dura.",
  },
  {
    Icono: IconoEstrella,
    titulo: "Reputación a la vista",
    texto: "Cada oferta muestra la calificación de quien conduce.",
  },
];

export function Seguridad() {
  return (
    <section id="seguridad" aria-labelledby="titulo-seguridad" className="px-4 pt-28 sm:px-6 sm:pt-36">
      <div className="mx-auto max-w-6xl rounded-[2rem] bg-primario px-6 py-14 sm:px-12 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
          <div>
            <h2
              id="titulo-seguridad"
              className="text-4xl font-bold tracking-[-0.035em] text-balance sm:text-6xl"
            >
              Tu seguridad va primero.
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-pretty">
              UniGo es solo para la comunidad de la universidad, y cada regla
              de seguridad la hace cumplir el sistema, no la buena voluntad.
            </p>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2">
            {GARANTIAS.map(({ Icono, titulo, texto }) => (
              <li key={titulo} className="rounded-3xl bg-fondo p-6">
                <Icono className="size-7 text-secundario" />
                <h3 className="mt-5 text-lg tracking-tight">{titulo}</h3>
                <p className="mt-2 leading-relaxed text-texto-suave">{texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
