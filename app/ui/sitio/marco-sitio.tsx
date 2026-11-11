import Link from "next/link";
import { BotonTema } from "@/app/ui/comun/boton-tema";
import { Logo } from "@/app/ui/comun/logo";

// Barra y pie del sitio público. La barra baja con la persona (sticky) para
// tener siempre a mano Entrar, Crear cuenta y el modo claro u oscuro. Va con
// el fondo un poco transparente y desenfocado para que el contenido se note
// al pasar por debajo, y una línea fina que solo separa.

export function BarraSitio() {
  return (
    <header id="barra-sitio" className="sticky top-0 z-30 border-b border-linea/70 bg-fondo/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-5 py-2.5">
        <Link href="/" aria-label="UniGo, inicio" className="flex min-h-11 items-center">
          <Logo ancho={97} alto={34} prioridad className="h-[34px] w-auto" />
        </Link>
        <nav aria-label="Cuenta" className="flex items-center gap-1 sm:gap-2">
          <BotonTema />
          <Link href="/entrar" className="flex min-h-11 items-center px-3.5 text-[15px] font-semibold text-texto hover:text-secundario">
            Entrar
          </Link>
          <Link
            href="/registro"
            className="flex min-h-11 items-center rounded-full bg-primario px-[18px] font-titulo text-[15px] font-semibold text-sobre-primario transition-colors hover:bg-primario/85"
          >
            Crear cuenta
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PieSitio() {
  return (
    <footer className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-8 gap-y-4 px-5 pt-12 pb-10 text-sm text-texto-suave">
      <Logo ancho={80} alto={28} className="h-7 w-auto" />
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
