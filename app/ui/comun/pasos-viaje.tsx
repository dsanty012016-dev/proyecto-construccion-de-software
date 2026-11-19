// En qué va el viaje, dibujado como una ruta con tres paradas: aceptado, en
// viaje y la llegada. Las paradas ya pasadas van llenas, la actual es un aro
// (el mismo de la barra inferior) y la línea se pinta hasta donde va el viaje.
const PASOS = ["aceptado", "en_curso", "terminado"] as const;
const LADO = ["items-start text-left", "items-center text-center", "items-end text-right"];

export function PasosViaje({ estado, regreso }: { estado: (typeof PASOS)[number]; regreso?: boolean }) {
  const actual = PASOS.indexOf(estado);
  const textos = ["Aceptado", "En viaje", regreso ? "Llegada" : "En la U"];
  return (
    <div className="trayecto-progreso relative" data-paso={actual}>
      <div className="trayecto-riel absolute inset-x-2 top-[7px]" aria-hidden="true">
        <div className="trayecto-avance" />
      </div>
      <ol aria-label="Progreso del viaje" className="relative grid grid-cols-3 gap-x-2">
        {textos.map((texto, i) => (
          <li key={texto} aria-current={i === actual ? "step" : undefined} data-pasado={i < actual}
            className={`relative flex min-w-0 flex-col gap-1.5 ${LADO[i]}`}>
            <span className={i === actual ? "trayecto-punto trayecto-punto-actual" : "trayecto-punto"} aria-hidden="true" />
            <span className={`max-w-full text-xs [overflow-wrap:anywhere] ${i === actual ? "font-bold text-texto" : "text-texto-suave"}`}>{texto}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
