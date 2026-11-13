import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { COLOR_BARRA, SCRIPT_TEMA } from "@/app/lib/tema";
import { RegistrarServiceWorker } from "@/app/ui/comun/registrar-sw";
import "./globals.css";

// Archivo: la única letra de UniGo. Es una sola fuente variable; en su ancho
// normal es el texto y, en el más angosto y el peso más negro, los títulos de
// cartel y las cifras (ver globals.css). Va guardada en el proyecto (licencia
// abierta OFL) y recortada a las letras del español, así el build no depende
// de internet.
const archivo = localFont({
  src: "./ui/comun/fuentes/archivo-latino.ttf",
  variable: "--font-archivo",
  weight: "100 900",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
});

// Dirección pública: la de producción en Vercel (Vercel da la variable al
// compilar); en el computador, localhost. Sirve para los enlaces absolutos
// de las vistas previas al compartir.
const SITIO = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITIO),
  title: {
    default: "UniGo · Tu viaje, tu universidad",
    template: "%s · UniGo",
  },
  description:
    "UniGo conecta a estudiantes universitarios que comparten la misma ruta hacia la universidad.",
  applicationName: "UniGo",
  appleWebApp: {
    capable: true,
    title: "UniGo",
    statusBarStyle: "black-translucent",
  },
};

// Pensada para celular: sin zoom accidental y con la barra del navegador
// del mismo color que el fondo, en modo claro y en oscuro (si la persona
// elige un modo con el botón, tema-navegador.ts la actualiza).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: COLOR_BARRA.claro },
    { media: "(prefers-color-scheme: dark)", color: COLOR_BARRA.oscuro },
  ],
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: el código de abajo pone data-tema en <html>
    // antes de que React arranque, y eso no es un error.
    <html lang="es" className={archivo.variable} suppressHydrationWarning>
      <head>
        {/* Pone el modo guardado (claro u oscuro) antes de pintar, para que no parpadee. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-dvh">
        {children}
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
