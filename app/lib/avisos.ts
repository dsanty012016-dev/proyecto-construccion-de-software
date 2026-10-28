// Notificaciones en el celular (fase 12): funciones puras que usa el botón de
// activarlas. Las prueba avisos.test.ts.

/**
 * La clave pública VAPID viene en base64url (la da web-push); el navegador la
 * pide en bytes para suscribirse. Null si no es una clave válida (65 bytes).
 */
export function claveVapidABytes(clave: string): Uint8Array<ArrayBuffer> | null {
  const limpia = clave.trim();
  if (!/^[A-Za-z0-9_-]+$/.test(limpia)) return null;
  const base64 = limpia.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (limpia.length % 4)) % 4);
  let binario: string;
  try {
    binario = atob(base64);
  } catch {
    return null;
  }
  if (binario.length !== 65) return null;
  const bytes = new Uint8Array(new ArrayBuffer(binario.length));
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

/** Lo que el navegador entrega al suscribirse, listo para guardar (o null si falta algo). */
export function datosDeSuscripcion(json: { endpoint?: string; keys?: Record<string, string> }) {
  const endpoint = json.endpoint ?? "";
  const p256dh = json.keys?.p256dh ?? "";
  const auth = json.keys?.auth ?? "";
  if (!endpoint.startsWith("https://") || endpoint.length > 1000) return null;
  if (p256dh.length < 20 || p256dh.length > 200 || auth.length < 10 || auth.length > 100) return null;
  return { endpoint, p256dh, auth };
}
