import { claveVapidABytes } from "./avisos";

// Una suscripción pertenece al navegador, no a la cuenta de UniGo. Antes de
// mostrarla como activa hay que asociarla a la persona que tiene sesión ahora.
export type EstadoNotificaciones =
  | { paso: "cargando" }
  | { paso: "no-disponible" }
  | { paso: "instalar-primero" }
  | { paso: "bloqueadas" }
  | { paso: "apagadas" }
  | { paso: "activas"; endpoint: string };

type GuardarSuscripcion = (datos: PushSubscriptionJSON) => Promise<{ ok: boolean; mensaje?: string }>;

let pendiente: Promise<unknown> = Promise.resolve();

// Evita que una activación pendiente vuelva a guardar la suscripción después
// de quitarla al salir. Web Locks coordina también las pestañas del mismo sitio.
export function enOrdenAvisos<T>(accion: () => Promise<T>): Promise<T> {
  const ejecutar = async (): Promise<T> => {
    if (navigator.locks) return await navigator.locks.request("unigo-avisos", accion);
    return accion();
  };
  const resultado = pendiente.then(ejecutar, ejecutar);
  pendiente = resultado.then(() => undefined, () => undefined);
  return resultado;
}

export async function estadoNotificaciones(clave: string, guardar: GuardarSuscripcion): Promise<EstadoNotificaciones> {
  const esIphone = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const instalada = window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (esIphone && !instalada) return { paso: "instalar-primero" };
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window) || !claveVapidABytes(clave)) {
    return { paso: "no-disponible" };
  }
  if (Notification.permission === "denied") return { paso: "bloqueadas" };
  const registro = await navigator.serviceWorker.getRegistration();
  const suscripcion = await registro?.pushManager.getSubscription();
  if (!suscripcion) return { paso: "apagadas" };
  try {
    const resultado = await guardar(suscripcion.toJSON());
    if (!resultado.ok) throw new Error(resultado.mensaje || "No pudimos comprobar las notificaciones de esta cuenta.");
  } catch (error) {
    // Si seguía asociada a una cuenta anterior, se deja de recibir también en
    // el navegador. No basta con esconder el aviso de "activas".
    await suscripcion.unsubscribe();
    throw error;
  }
  return { paso: "activas", endpoint: suscripcion.endpoint };
}

/** Identifica solo este navegador antes de que el servidor cierre la sesión. */
export async function formularioDeSalida(formulario: FormData): Promise<FormData> {
  // Se elimina cualquier valor previo: el endpoint lo da el navegador.
  formulario.delete("endpoint");
  if ("serviceWorker" in navigator) {
    const registro = await navigator.serviceWorker.getRegistration();
    const suscripcion = await registro?.pushManager.getSubscription();
    if (suscripcion) formulario.set("endpoint", suscripcion.endpoint);
  }
  return formulario;
}
