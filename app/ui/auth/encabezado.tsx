import Link from "next/link";
import { IconoAtras } from "./iconos-auth";

// Encabezados de las pantallas de acceso. El logo ya va en el marco
// (app/(auth)/layout.tsx); aquí va el título en letra de cartel, alineado a
// la izquierda como el resto de UniGo, y debajo una línea que explica.

export function EncabezadoLogo({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  return (
    <header className="mb-8">
      <h1 className="cartel text-[3.25rem]">{titulo}</h1>
      <p className="mt-3 text-lg leading-snug text-texto-suave">{subtitulo}</p>
    </header>
  );
}

export function EncabezadoVolver({
  titulo,
  subtitulo,
  volverA = "/entrar",
}: {
  titulo: string;
  subtitulo: string;
  volverA?: string;
}) {
  return (
    <header className="mb-8">
      <Link
        href={volverA}
        className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-xl pr-3 pl-1 text-sm font-semibold text-texto-suave hover:text-texto"
      >
        <IconoAtras className="size-5" />
        Volver
      </Link>
      <h1 className="mt-3 cartel text-[3.25rem]">{titulo}</h1>
      <p className="mt-3 text-lg leading-snug text-texto-suave">{subtitulo}</p>
    </header>
  );
}

export function PieEnlace({ texto, enlace, href }: { texto: string; enlace: string; href: string }) {
  return (
    <p className="mt-8 border-t border-linea pt-4 text-texto-suave">
      {texto}{" "}
      <Link href={href} className="inline-flex min-h-11 items-center font-bold underline decoration-2 underline-offset-4">
        {enlace}
      </Link>
    </p>
  );
}
