import type { MetadataRoute } from "next";

// Manifiesto de la PWA: permite agregar UniGo a la pantalla de inicio del
// celular y que se abra como una app, sin la barra del navegador.
// Sin internet, el service worker (public/sw.js) muestra /sin-conexion.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "UniGo",
    short_name: "UniGo",
    description: "Tu viaje, tu universidad",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1220",
    theme_color: "#0b1220",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
