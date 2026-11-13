import Link from "next/link";
import { BotonTema } from "@/app/ui/comun/boton-tema";
import { Logo } from "@/app/ui/comun/logo";

// Barra y pie del sitio público (estilos en portada.css). La barra baja con
// la persona para tener siempre a mano Entrar, Crear cuenta y el modo claro u
// oscuro; el id "barra-sitio" lo usa globals.css para que los enlaces a
// secciones no queden debajo de ella.

export function BarraSitio() {
  return (
    <header id="barra-sitio" className="barra">
      <div className="marco">
        <Link href="/" aria-label="UniGo, inicio" className="flex min-h-11 items-center">
          <Logo ancho={97} alto={34} prioridad />
        </Link>
        <nav aria-label="Cuenta">
          <BotonTema />
          <Link href="/entrar" className="enlace">
            Entrar
          </Link>
          <Link href="/registro" className="boton boton-lleno">
            Crear cuenta
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PieSitio() {
  return (
    <footer className="pie">
      <div className="marco">
        <Logo ancho={80} alto={28} />
        <p>Proyecto académico de la Universidad Santo Tomás, seccional Villavicencio</p>
        <nav aria-label="Pie de página">
          <Link href="/#como-funciona">Cómo funciona</Link>
          <Link href="/#seguridad">Seguridad</Link>
          <Link href="/#precios">Precios</Link>
          <Link href="/privacidad">Privacidad</Link>
        </nav>
      </div>
    </footer>
  );
}
