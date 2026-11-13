import type { Metadata } from "next";
import { BotonTema } from "@/app/ui/comun/boton-tema";
import { Logo } from "@/app/ui/comun/logo";
import { BotonReintentar } from "@/app/ui/comun/boton-reintentar";

export const metadata: Metadata = { title: "Sin conexión", robots: { index: false } };

// La muestra el service worker (public/sw.js) cuando una página no carga por
// falta de internet. Es estática: no depende de la sesión ni de la base.
export default function PaginaSinConexion() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-start justify-center gap-5 px-5 py-10">
      <div className="flex w-full items-center justify-between gap-3">
        <Logo ancho={97} alto={34} className="h-[34px] w-auto" prioridad sinOptimizar />
        <BotonTema />
      </div>
      <h1 className="cartel text-[2.75rem]">Sin conexión</h1>
      <p className="leading-relaxed text-texto-suave">
        No hay internet en este momento. Tus viajes, tu saldo y tus cupos siguen guardados; apenas vuelva la señal, sigues donde ibas.
      </p>
      <BotonReintentar />
    </main>
  );
}
