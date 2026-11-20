import { redirect } from "next/navigation";
import Link from "next/link";
import { politicaAlDia } from "@/app/lib/privacidad";
import { perfilActual } from "@/app/lib/sesion";
import { BarraInferior } from "@/app/ui/comun/barra-inferior";
import { BotonTema } from "@/app/ui/comun/boton-tema";
import { Logo } from "@/app/ui/comun/logo";
import { TransicionPantalla } from "@/app/ui/comun/transicion-pantalla";

// Marco de la zona privada: columna de celular y barra inferior según el rol.
// Sin rol (cuenta nueva) no hay barra: primero tiene que elegir. Sin la
// política de privacidad vigente aceptada, primero la acepta (Ley 1581).
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const { perfil } = await perfilActual();
  if (perfil && !politicaAlDia(perfil.politica_version)) redirect("/aceptar-politica");
  return (
    <div className="producto-tema">
      <a className="producto-salto" href="#contenido-app">Saltar al contenido</a>
      <header className="producto-encabezado">
        <div className="producto-barra">
          <Link href="/inicio" aria-label="Inicio de UniGo" className="inline-flex min-h-11 items-center">
            <Logo ancho={227} alto={80} className="h-7 w-auto md:h-20" alt="" />
          </Link>
          <BotonTema />
        </div>
      </header>
      <div className={perfil?.rol ? "producto-cuerpo producto-con-navegacion" : "producto-cuerpo pb-8"}>
        {perfil?.rol && <BarraInferior rol={perfil.rol} />}
        <div id="contenido-app" tabIndex={-1} className="min-w-0">
          <TransicionPantalla>{children}</TransicionPantalla>
        </div>
      </div>
    </div>
  );
}
