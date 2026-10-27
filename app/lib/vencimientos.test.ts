// Pruebas de los vencimientos (deben coincidir con 018-vencimientos.sql).
import { describe, expect, it } from "vitest";
import { cupoVencido, horaDe, solicitudVencida, venceCupo, venceSolicitud } from "./vencimientos";

const minuto = 60_000;
// 22 de octubre de 2026, 6:30 a. m. en Colombia.
const t = Date.UTC(2026, 9, 22, 11, 30);

describe("solicitud de viaje", () => {
  it("vence a los 15 minutos, no antes", () => {
    expect(venceSolicitud(t)).toBe(t + 15 * minuto);
    expect(solicitudVencida(t, t + 14 * minuto)).toBe(false);
    expect(solicitudVencida(t, t + 15 * minuto)).toBe(true);
  });
});

describe("cupo", () => {
  it("vence 5 minutos después de la hora de salida", () => {
    expect(venceCupo(t)).toBe(t + 5 * minuto);
    expect(cupoVencido(t, t + 3 * minuto)).toBe(false);
    expect(cupoVencido(t, t + 5 * minuto)).toBe(true);
  });
});

it("la hora se escribe en hora de Colombia", () => {
  expect(horaDe(t)).toBe("6:30 a. m.");
  expect(horaDe(t + 15 * minuto)).toBe("6:45 a. m.");
});
