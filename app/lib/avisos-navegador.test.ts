import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enOrdenAvisos, estadoNotificaciones, formularioDeSalida } from "./avisos-navegador";

const CLAVE = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
const endpoint = "https://push.example.com/este-celular";
const datos = { endpoint, keys: { p256dh: "p".repeat(87), auth: "a".repeat(22) } };
const obtenerSuscripcion = vi.fn();
const cancelarSuscripcion = vi.fn();

beforeEach(() => {
  cancelarSuscripcion.mockReset().mockResolvedValue(true);
  obtenerSuscripcion.mockReset().mockResolvedValue({ endpoint, toJSON: () => datos, unsubscribe: cancelarSuscripcion });
  vi.stubGlobal("navigator", {
    userAgent: "navegador de prueba",
    serviceWorker: { getRegistration: async () => ({ pushManager: { getSubscription: obtenerSuscripcion } }) },
  });
  vi.stubGlobal("window", { matchMedia: () => ({ matches: false }), PushManager: {}, Notification: {} });
  vi.stubGlobal("Notification", { permission: "granted" });
});
afterEach(() => vi.unstubAllGlobals());

describe("asociación del navegador a la cuenta actual", () => {
  it("reasocia una suscripción heredada de A antes de mostrarla activa para B", async () => {
    const propietarios = new Map([[endpoint, "cuenta-a"]]);
    const guardar = vi.fn(async (suscripcion: PushSubscriptionJSON) => {
      propietarios.set(suscripcion.endpoint!, "cuenta-b");
      return { ok: true };
    });
    expect(await estadoNotificaciones(CLAVE, guardar)).toEqual({ paso: "activas", endpoint });
    expect(guardar).toHaveBeenCalledWith(datos);
    expect(propietarios.get(endpoint)).toBe("cuenta-b");
  });

  it("no muestra activas si falla la asociación a la cuenta", async () => {
    await expect(estadoNotificaciones(CLAVE, async () => ({ ok: false, mensaje: "No se guardó" }))).rejects.toThrow("No se guardó");
    expect(cancelarSuscripcion).toHaveBeenCalledOnce();
  });

  it("cancela la suscripción heredada también ante una falla de transporte", async () => {
    await expect(estadoNotificaciones(CLAVE, async () => { throw new Error("sin conexión"); })).rejects.toThrow("sin conexión");
    expect(cancelarSuscripcion).toHaveBeenCalledOnce();
  });

  it("no registra nada ni pide permisos si no hay una suscripción previa", async () => {
    obtenerSuscripcion.mockResolvedValue(null);
    const guardar = vi.fn();
    expect(await estadoNotificaciones(CLAVE, guardar)).toEqual({ paso: "apagadas" });
    expect(guardar).not.toHaveBeenCalled();
  });

  it("respeta el permiso bloqueado", async () => {
    vi.stubGlobal("Notification", { permission: "denied" });
    const guardar = vi.fn();
    expect(await estadoNotificaciones(CLAVE, guardar)).toEqual({ paso: "bloqueadas" });
    expect(guardar).not.toHaveBeenCalled();
  });

  it("permite usar la app en navegadores sin notificaciones", async () => {
    vi.stubGlobal("navigator", { userAgent: "navegador sin push" });
    expect(await estadoNotificaciones(CLAVE, vi.fn())).toEqual({ paso: "no-disponible" });
  });
});

describe("activaciones y cierre simultáneos", () => {
  it("espera la activación pendiente antes de quitar la suscripción al salir", async () => {
    const eventos: string[] = [];
    let completar!: () => void;
    const guardar = enOrdenAvisos(async () => {
      await new Promise<void>((resolver) => { completar = resolver; });
      eventos.push("guardar");
    });
    await Promise.resolve();
    const salir = enOrdenAvisos(async () => { eventos.push("borrar y salir"); });
    expect(eventos).toEqual([]);
    completar();
    await Promise.all([guardar, salir]);
    expect(eventos).toEqual(["guardar", "borrar y salir"]);
  });

  it("permite reintentar después de un fallo", async () => {
    await expect(enOrdenAvisos(async () => { throw new Error("sin conexión"); })).rejects.toThrow("sin conexión");
    expect(await enOrdenAvisos(async () => "reintento correcto")).toBe("reintento correcto");
  });

  it("usa un bloqueo compartido entre pestañas cuando el navegador lo ofrece", async () => {
    const request = vi.fn(async (_nombre: string, accion: () => Promise<string>) => accion());
    vi.stubGlobal("navigator", { locks: { request } });
    expect(await enOrdenAvisos(async () => "listo")).toBe("listo");
    expect(request).toHaveBeenCalledWith("unigo-avisos", expect.any(Function));
  });
});

describe("identificación del dispositivo al salir", () => {
  it("envía el endpoint real y reemplaza un valor anterior del formulario", async () => {
    const formulario = new FormData();
    formulario.set("endpoint", "https://push.example.com/otro");
    expect((await formularioDeSalida(formulario)).get("endpoint")).toBe(endpoint);
  });

  it("sale sin endpoint si el navegador no tiene suscripción", async () => {
    obtenerSuscripcion.mockResolvedValue(null);
    expect((await formularioDeSalida(new FormData())).has("endpoint")).toBe(false);
  });

  it("sale sin endpoint en navegadores sin service worker", async () => {
    vi.stubGlobal("navigator", {});
    expect((await formularioDeSalida(new FormData())).has("endpoint")).toBe(false);
  });

  it("detiene el cierre si no se pudo comprobar la suscripción", async () => {
    obtenerSuscripcion.mockRejectedValue(new Error("No se pudo leer"));
    await expect(formularioDeSalida(new FormData())).rejects.toThrow("No se pudo leer");
  });
});
