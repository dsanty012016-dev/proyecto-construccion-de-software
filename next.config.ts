import type { NextConfig } from "next";

// Cabeceras de seguridad para todas las páginas (revisión de seguridad, fase 7):
// - nadie puede meter UniGo en un iframe (evita que la disfracen para robar clics);
// - el navegador no adivina tipos de archivo;
// - a otros sitios solo se les dice de qué dominio venimos, no la ruta (que puede
//   llevar el token de un viaje compartido);
// - la ubicación solo la pide UniGo; cámara y micrófono, nadie;
// - siempre por https.
// No se pone una CSP completa todavía: el mapa (MapLibre, OpenFreeMap, OSRM) y
// el 3D de la landing (A-Frame) cargan de varios dominios y hay que probarla en
// Vercel antes de activarla.
const cabeceras = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: cabeceras }];
  },
};

export default nextConfig;
