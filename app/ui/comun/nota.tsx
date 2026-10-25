import { calificacionTexto } from "@/app/lib/formato";
import { IconoEstrella } from "./iconos-app";

// Calificación de una persona: estrella dibujada (no el carácter "★") y el
// promedio. Sin calificaciones dice "Nuevo". El lector de pantalla oye
// "calificación 4,9 de 5".
export function Nota({ promedio, total }: { promedio: number | null | undefined; total: number }) {
  if (total <= 0) return <>Nuevo</>;
  const texto = calificacionTexto(promedio);
  return (
    <span className="inline-flex items-center gap-1 align-[-0.125em]">
      <IconoEstrella llena className="size-[0.95em] text-secundario" />
      <span aria-hidden="true">{texto}</span>
      <span className="sr-only">calificación {texto} de 5</span>
    </span>
  );
}
