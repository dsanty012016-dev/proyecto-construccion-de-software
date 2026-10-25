import { BarraSitio, PieSitio } from "@/app/ui/sitio/marco-sitio";

// Marco del sitio público (la landing): barra arriba y pie abajo. La zona
// privada tiene su propio marco con la barra inferior (grupo "(app)").
export default function LayoutSitio({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-clip">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-texto focus:px-5 focus:py-3 focus:text-fondo"
      >
        Saltar al contenido
      </a>
      <BarraSitio />
      <main id="contenido">{children}</main>
      <PieSitio />
    </div>
  );
}
