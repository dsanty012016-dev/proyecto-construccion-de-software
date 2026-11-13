import localFont from "next/font/local";
import { BarraSitio, PieSitio } from "@/app/ui/sitio/marco-sitio";
import "@/app/ui/sitio/portada.css";

// Archivo: la letra del sitio público. Es una sola fuente variable; en su
// ancho más angosto y su peso más negro hace los titulares de cartel, y en su
// ancho normal el texto. Va guardada en el proyecto (licencia abierta OFL) y
// recortada a las letras del español.
const archivo = localFont({
  src: "../ui/sitio/fuentes/archivo-latino.ttf",
  variable: "--font-archivo",
  weight: "100 900",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
});

// Marco del sitio público (la landing): barra arriba y pie abajo. La zona
// privada tiene su propio marco con la barra inferior (grupo "(app)").
export default function LayoutSitio({ children }: { children: React.ReactNode }) {
  return (
    <div className={`sitio overflow-x-clip ${archivo.variable}`}>
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
