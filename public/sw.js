/* global self, caches */
// Service worker de UniGo (fase 11). Hace poco, a propósito:
// - guarda la página "sin conexión" y la muestra si una página no carga por
//   falta de internet;
// - guarda los archivos fijos de Next (/_next/static/, cambian de nombre en
//   cada versión) para que esa página se vea bien sin internet.
// No guarda páginas ni datos de la app: viajes, saldo y ubicación siempre
// vienen frescos del servidor.

const VERSION = "unigo-v1";
const ESTATICOS = "unigo-estaticos";
const SIN_CONEXION = "/sin-conexion";
const MAXIMO_ESTATICOS = 80;

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll([SIN_CONEXION, "/brand/logo-oscuro.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n !== VERSION && n !== ESTATICOS).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

/** Deja solo los últimos archivos fijos guardados, para no llenar el celular. */
async function recortar(cache) {
  const claves = await cache.keys();
  await Promise.all(claves.slice(0, Math.max(0, claves.length - MAXIMO_ESTATICOS)).map((clave) => cache.delete(clave)));
}

self.addEventListener("fetch", (evento) => {
  const { request } = evento;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Páginas: siempre de la red; sin internet, la página "sin conexión".
  if (request.mode === "navigate") {
    evento.respondWith(fetch(request).catch(() => caches.match(SIN_CONEXION, { cacheName: VERSION })));
    return;
  }

  // El logo de la página "sin conexión".
  if (url.pathname === "/brand/logo-oscuro.png") {
    evento.respondWith(caches.match(request, { cacheName: VERSION }).then((guardado) => guardado ?? fetch(request)));
    return;
  }

  // Archivos fijos de Next: primero lo guardado, si no, de la red y se guarda.
  if (url.pathname.startsWith("/_next/static/")) {
    evento.respondWith(
      caches.open(ESTATICOS).then(async (cache) => {
        const guardado = await cache.match(request);
        if (guardado) return guardado;
        const respuesta = await fetch(request);
        if (respuesta.ok) {
          await cache.put(request, respuesta.clone());
          recortar(cache);
        }
        return respuesta;
      }),
    );
  }
});

// Notificaciones (fase 12): llegan desde la función "enviar-avisos" de Supabase
// con { titulo, cuerpo, url }. Al tocarla se abre (o se enfoca) UniGo en esa
// pantalla.
self.addEventListener("push", (evento) => {
  let datos = {};
  try {
    datos = evento.data ? evento.data.json() : {};
  } catch {
    datos = {};
  }
  const url = typeof datos.url === "string" && datos.url.startsWith("/") ? datos.url : "/inicio";
  evento.waitUntil(
    self.registration.showNotification(datos.titulo || "UniGo", {
      body: datos.cuerpo || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      lang: "es",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const destino = new URL(evento.notification.data?.url || "/inicio", self.location.origin).href;
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      for (const ventana of ventanas) {
        if (new URL(ventana.url).origin === self.location.origin && "focus" in ventana) {
          ventana.navigate(destino);
          return ventana.focus();
        }
      }
      return self.clients.openWindow(destino);
    }),
  );
});
