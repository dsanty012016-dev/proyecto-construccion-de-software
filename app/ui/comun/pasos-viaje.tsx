import { etiquetaEstado } from "@/app/lib/formato";

// Tres tramos que muestran en qué paso va el viaje: aceptado → en curso → terminado.
const PASOS = [
  { estado: "aceptado", texto: "Aceptado" },
  { estado: "en_curso", texto: "En curso" },
  { estado: "terminado", texto: "Terminado" },
] as const;

export function PasosViaje({ estado }: { estado: "aceptado" | "en_curso" | "terminado" }) {
  const actual = PASOS.findIndex((p) => p.estado === estado);
  return (
    <div>
      <p className="sr-only">Estado del viaje: {etiquetaEstado(estado)}</p>
      <ol aria-hidden="true" className="grid grid-cols-3 gap-1.5">
        {PASOS.map((paso, i) => (
          <li key={paso.estado} className="space-y-1.5">
            <span className={`block h-1 rounded-full ${i <= actual ? "bg-secundario" : "bg-texto-suave/25"}`} />
            <span className={`block text-xs ${i === actual ? "font-bold text-texto" : "text-texto-suave"}`}>{paso.texto}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
