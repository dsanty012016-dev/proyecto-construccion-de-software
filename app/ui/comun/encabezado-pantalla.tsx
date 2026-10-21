import Link from "next/link";
import { IconoAtras } from "./iconos-app";

// Título de una pantalla interna, con el botón de volver (44 px de alto).
export function EncabezadoPantalla({ titulo, volverA, texto }: { titulo: string; volverA?: string; texto?: string }) {
  return (
    <header className="flex items-center gap-3">
      {volverA && (
        <Link
          href={volverA}
          aria-label="Volver"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-superficie text-texto"
        >
          <IconoAtras className="size-5" />
        </Link>
      )}
      <div className="min-w-0">
        <h1 className="text-2xl tracking-tight">{titulo}</h1>
        {texto && <p className="text-sm text-texto-suave">{texto}</p>}
      </div>
    </header>
  );
}
