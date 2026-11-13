import { etiquetaEstado } from "@/app/lib/formato";

// En qué va el viaje, dibujado como una ruta con tres paradas: aceptado, en
// viaje y la llegada. Las paradas ya pasadas van llenas, la actual es un aro
// (el mismo de la barra inferior) y la línea se pinta hasta donde va el viaje.
const PASOS = ["aceptado", "en_curso", "terminado"] as const;
const AVANCE = ["w-0", "w-1/2", "w-full"];
const LADO = ["items-start text-left", "items-center text-center", "items-end text-right"];

export function PasosViaje({ estado, regreso }: { estado: (typeof PASOS)[number]; regreso?: boolean }) {
  const actual = PASOS.indexOf(estado);
  const textos = ["Aceptado", "En viaje", regreso ? "Llegada" : "En la U"];
  return (
    <div>
      <p className="sr-only">Estado del viaje: {etiquetaEstado(estado)}</p>
      <ol aria-hidden="true" className="relative grid grid-cols-3">
        <li className="absolute inset-x-1.5 top-[7px] h-0.5 bg-texto-suave/25">
          <span className={`block h-full bg-secundario ${AVANCE[actual]}`} />
        </li>
        {textos.map((texto, i) => (
          <li key={texto} className={`relative flex flex-col gap-1.5 ${LADO[i]}`}>
            <span
              className={`block size-4 rounded-full ${
                i < actual ? "bg-secundario" : i === actual ? "border-[3px] border-primario bg-fondo" : "border-2 border-texto-suave/40 bg-fondo"
              }`}
            />
            <span className={`text-xs ${i === actual ? "font-bold text-texto" : "text-texto-suave"}`}>{texto}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
