import Image from "next/image";
import Link from "next/link";
import { IconoAtras } from "./iconos-auth";

// Encabezados de las pantallas de acceso: con el logo grande (entrar) o con
// botón para volver (registro y recuperar), como en los mockups.

export function EncabezadoLogo({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  return (
    <header className="mb-8 text-center">
      <Image
        src="/brand/logo-oscuro.png"
        alt="UniGo, tu viaje, tu universidad"
        width={1170}
        height={412}
        priority
        className="mx-auto h-auto w-56"
      />
      <h1 className="mt-10 text-3xl tracking-tight">{titulo}</h1>
      <p className="mt-2 text-texto-suave">{subtitulo}</p>
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
        aria-label="Volver"
        className="-ml-3 flex size-11 items-center justify-center rounded-full text-texto hover:bg-superficie"
      >
        <IconoAtras className="size-6" />
      </Link>
      <h1 className="mt-4 text-3xl tracking-tight">{titulo}</h1>
      <p className="mt-2 leading-relaxed text-texto-suave">{subtitulo}</p>
    </header>
  );
}

export function PieEnlace({ texto, enlace, href }: { texto: string; enlace: string; href: string }) {
  return (
    <p className="mt-8 text-center text-sm text-texto-suave">
      {texto}{" "}
      <Link href={href} className="inline-flex min-h-11 items-center font-semibold">
        {enlace}
      </Link>
    </p>
  );
}
