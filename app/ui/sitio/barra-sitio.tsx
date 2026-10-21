import Image from "next/image";
import Link from "next/link";

// Barra superior del sitio público. En celular solo quedan el logo y "Únete";
// las secciones se recorren bajando por la página.
const ENLACES = [
  { href: "#como-funciona", texto: "Cómo funciona" },
  { href: "#conducir", texto: "Conductores" },
  { href: "#seguridad", texto: "Seguridad" },
  { href: "#equipo", texto: "Equipo" },
];

export function BarraSitio() {
  return (
    <header className="sticky top-0 z-40 border-b border-linea/70 bg-fondo/80 backdrop-blur-xl">
      <nav
        aria-label="Principal"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6"
      >
        <Link href="/" aria-label="UniGo, inicio" className="-m-2 flex min-h-11 items-center p-2">
          <Image
            src="/brand/logo-oscuro.png"
            alt=""
            width={1170}
            height={412}
            priority
            className="h-8 w-auto"
          />
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {ENLACES.map((enlace) => (
            <li key={enlace.href}>
              <a
                href={enlace.href}
                className="flex min-h-11 items-center rounded-full px-4 text-sm font-medium text-texto-suave transition-colors hover:text-texto"
              >
                {enlace.texto}
              </a>
            </li>
          ))}
        </ul>

        <a
          href="#unete"
          className="flex min-h-11 items-center rounded-full bg-primario px-5 text-sm font-semibold text-texto transition-colors hover:bg-primario/85"
        >
          Únete
        </a>
      </nav>
    </header>
  );
}
