"use client";

import { useEffect } from "react";

// Registra el service worker (public/sw.js) para la página "sin conexión".
// Solo en producción: al desarrollar, un service worker guarda cosas viejas.
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Si no se puede (navegador viejo o modo privado), la app sigue igual.
    });
  }, []);
  return null;
}
