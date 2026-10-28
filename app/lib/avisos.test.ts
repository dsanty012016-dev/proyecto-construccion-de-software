// Pruebas de las funciones de las notificaciones.
import { describe, expect, it } from "vitest";
import { claveVapidABytes, datosDeSuscripcion } from "./avisos";

// Una clave pública VAPID de ejemplo (65 bytes en base64url, empieza con 0x04).
const CLAVE = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

describe("clave VAPID", () => {
  it("se convierte en 65 bytes", () => {
    const bytes = claveVapidABytes(CLAVE);
    expect(bytes?.length).toBe(65);
    expect(bytes?.[0]).toBe(4);
  });

  it("rechaza claves vacías, cortas o con caracteres raros", () => {
    expect(claveVapidABytes("")).toBeNull();
    expect(claveVapidABytes("abc")).toBeNull();
    expect(claveVapidABytes(CLAVE + "!")).toBeNull();
  });
});

describe("suscripción", () => {
  const buena = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "p".repeat(87), auth: "a".repeat(22) } };

  it("toma solo lo necesario", () => {
    expect(datosDeSuscripcion(buena)).toEqual({ endpoint: buena.endpoint, p256dh: "p".repeat(87), auth: "a".repeat(22) });
  });

  it("rechaza direcciones sin https o claves que faltan", () => {
    expect(datosDeSuscripcion({ ...buena, endpoint: "http://x.com" })).toBeNull();
    expect(datosDeSuscripcion({ endpoint: buena.endpoint })).toBeNull();
  });
});
