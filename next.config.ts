import type { NextConfig } from "next";

// Cabeceras de seguridad para todas las páginas (revisión de seguridad, fase 7):
// - nadie puede meter UniGo en un iframe (evita que la disfracen para robar clics);
// - el navegador no adivina tipos de archivo;
// - a otros sitios solo se les dice de qué dominio venimos, no la ruta (que puede
//   llevar el token de un viaje compartido);
// - la ubicación solo la pide UniGo; cámara y micrófono, nadie;
// - siempre por https;
// - CSP (fase 11): la página solo carga código y datos de los sitios que usa.

/** Supabase del proyecto (datos, sesión, tiempo real y documentos). */
const supabase = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "https://*.supabase.co";
  }
})();
const supabaseEnVivo = supabase.replace(/^https:/, "wss:");

// Barra de comentarios que Vercel pone solo en las vistas previas.
const vercelVivo = "https://vercel.live";

const politica = {
  "default-src": ["'self'"],
  // 'unsafe-inline': los scripts que Next.js escribe en la página. A-Frame
  // (el 3D de la landing) viene de aframe.io. Al desarrollar, Next necesita eval.
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    "https://aframe.io",
    vercelVivo,
    ...(process.env.NODE_ENV === "development" ? ["'unsafe-eval'"] : []),
  ],
  "style-src": ["'self'", "'unsafe-inline'"],
  // Mapa (OpenFreeMap), documentos de conductores (Supabase) e íconos en data:.
  "img-src": ["'self'", "data:", "blob:", "https://tiles.openfreemap.org", supabase, vercelVivo, "https://vercel.com"],
  "font-src": ["'self'", "data:", vercelVivo],
  // Supabase, el mapa, las rutas por las calles (FOSSGIS) y la barra de Vercel.
  "connect-src": [
    "'self'",
    supabase,
    supabaseEnVivo,
    "https://tiles.openfreemap.org",
    "https://routing.openstreetmap.de",
    vercelVivo,
    "wss://ws-us3.pusher.com",
  ],
  // MapLibre dibuja el mapa en workers creados desde blob:.
  "worker-src": ["'self'", "blob:"],
  "child-src": ["'self'", "blob:"],
  "frame-src": [vercelVivo],
  "manifest-src": ["'self'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"],
  "upgrade-insecure-requests": [],
};

const csp = Object.entries(politica)
  .map(([directiva, valores]) => [directiva, ...valores].join(" "))
  .join("; ");

const cabeceras = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: cabeceras },
      // El service worker siempre se pide de nuevo (si no, una versión vieja se queda pegada).
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
    ];
  },
};

export default nextConfig;
