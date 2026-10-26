import Image from "next/image";
import Link from "next/link";

// Barra y pie del sitio público. La barra no es fija: la landing es corta de
// leer y así no tapa nada en el celular.

export function BarraSitio() {
  return (
    <header className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-5 py-4">
      <Link href="/" aria-label="UniGo, inicio" className="flex min-h-11 items-center">
        <Image src="/brand/logo-oscuro.png" alt="UniGo" width={97} height={34} priority className="h-[34px] w-auto" />
      </Link>
      <nav aria-label="Cuenta" className="flex items-center gap-2">
        <Link href="/entrar" className="flex min-h-11 items-center px-3.5 text-[15px] font-semibold text-texto hover:text-secundario">
          Entrar
        </Link>
        <Link
          href="/registro"
          className="flex min-h-11 items-center rounded-full bg-primario px-[18px] font-titulo text-[15px] font-semibold text-texto transition-colors hover:bg-primario/85"
        >
          Crear cuenta
        </Link>
      </nav>
    </header>
  );
}

export function PieSitio() {
  return (
    <footer className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-8 gap-y-4 px-5 pt-12 pb-10 text-sm text-texto-suave">
      <Image src="/brand/logo-oscuro.png" alt="UniGo" width={80} height={28} className="h-7 w-auto" />
      <p>Proyecto académico · Universidad Santo Tomás, seccional Villavicencio</p>
      <nav aria-label="Pie de página" className="flex flex-wrap gap-x-5">
        <Link href="/#como-funciona" className="inline-flex min-h-11 items-center text-texto-suave hover:text-texto">
          Cómo funciona
        </Link>
        <Link href="/#seguridad" className="inline-flex min-h-11 items-center text-texto-suave hover:text-texto">
          Seguridad
        </Link>
        <Link href="/#precios" className="inline-flex min-h-11 items-center text-texto-suave hover:text-texto">
          Precios
        </Link>
        <Link href="/privacidad" className="inline-flex min-h-11 items-center text-texto-suave hover:text-texto">
          Privacidad
        </Link>
      </nav>
    </footer>
  );
}
