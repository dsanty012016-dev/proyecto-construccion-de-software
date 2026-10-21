import { BarraSitio } from "@/app/ui/sitio/barra-sitio";
import { PieSitio } from "@/app/ui/sitio/pie-sitio";

// Marco del sitio público: barra arriba y pie abajo. La app privada tendrá
// su propio marco con la barra inferior (grupo "(app)").
export default function LayoutSitio({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-texto focus:px-5 focus:py-3 focus:text-fondo"
      >
        Saltar al contenido
      </a>
      <BarraSitio />
      <main id="contenido">{children}</main>
      <PieSitio />
    </>
  );
}
