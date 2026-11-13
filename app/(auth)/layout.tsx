import Link from "next/link";
import { BotonTema } from "@/app/ui/comun/boton-tema";
import { Logo } from "@/app/ui/comun/logo";

// Marco de las pantallas de acceso: una columna angosta de celular, centrada
// también en pantallas grandes. Arriba, el logo (lleva a la portada) y el
// botón de modo claro u oscuro; el título de cada pantalla va debajo, grande.
export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col px-6 pb-10">
      <div className="flex items-center justify-between gap-3 py-3">
        <Link href="/" aria-label="UniGo, ir a la portada" className="flex min-h-11 items-center">
          <Logo ancho={97} alto={34} prioridad className="h-[30px] w-auto" />
        </Link>
        <BotonTema className="-mr-2.5" />
      </div>
      <main className="flex flex-1 flex-col pt-6">{children}</main>
    </div>
  );
}
