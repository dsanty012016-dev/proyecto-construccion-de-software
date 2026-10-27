import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { RegistrarServiceWorker } from "@/app/ui/comun/registrar-sw";
import "./globals.css";

// Inter para títulos y Manrope para el texto (identidad de UniGo).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
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
// del mismo color que el fondo.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1220",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${inter.variable} ${manrope.variable}`}>
      <body className="min-h-dvh">
        {children}
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
