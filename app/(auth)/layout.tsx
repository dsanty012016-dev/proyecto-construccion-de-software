import Link from "next/link";
import { BotonTema } from "@/app/ui/comun/boton-tema";
import { Logo } from "@/app/ui/comun/logo";
import { TransicionPantalla } from "@/app/ui/comun/transicion-pantalla";

// Marco de las pantallas de acceso: una columna angosta de celular, centrada
// también en pantallas grandes. Arriba, el logo (lleva a la portada) y el
// botón de modo claro u oscuro; el título de cada pantalla va debajo, grande.
export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="producto-tema flow-root">
      <div className="producto-acceso">
        <header className="flex items-center justify-between gap-3 border-b border-linea pb-3">
          <Link href="/" aria-label="UniGo, ir a la portada" className="flex min-h-11 items-center">
            <Logo ancho={136} alto={48} prioridad className="h-[30px] w-auto md:h-12" />
          </Link>
          <BotonTema className="-mr-2.5" />
        </header>
        <TransicionPantalla><main>{children}</main></TransicionPantalla>
      </div>
    </div>
  );
}
