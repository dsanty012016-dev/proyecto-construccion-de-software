// Pruebas de las reglas de dinero (deben coincidir con 012-billetera.sql).
import { describe, expect, it } from "vitest";
import { cancelacionDeViaje, diasDeSuspension, limiteDePago, problemaConRecarga, puedePagarPuesto, salidaDeCupo } from "./pagos";

describe("cancelar un viaje aceptado", () => {
  it("cobra el 20 % y el conductor recibe ese cobro menos la comisión", () => {
    expect(cancelacionDeViaje(5000)).toEqual({ cobro: 1000, devolucion: 4000, alConductor: 900 });
    expect(cancelacionDeViaje(3000)).toEqual({ cobro: 600, devolucion: 2400, alConductor: 540 });
  });

  it("cobro y devolución suman el precio", () => {
    for (const precio of [1000, 1005, 6500, 7777, 100000]) {
      const r = cancelacionDeViaje(precio);
      expect(r.cobro + r.devolucion).toBe(precio);
    }
  });
});

describe("dejar un cupo", () => {
  const sale = Date.UTC(2026, 9, 22, 11, 30);
  it("con 40 minutos o más devuelve todo", () => {
    expect(salidaDeCupo(6000, sale, sale - 40 * 60_000)).toEqual({ cobro: 0, devolucion: 6000, tarde: false });
  });
  it("con menos de 40 minutos cobra el 30 %", () => {
    expect(salidaDeCupo(6000, sale, sale - 39 * 60_000)).toEqual({ cobro: 1800, devolucion: 4200, tarde: true });
  });
  it("sin pagar no hay nada que devolver, pero sigue siendo tarde", () => {
    expect(salidaDeCupo(0, sale, sale - 5 * 60_000)).toEqual({ cobro: 0, devolucion: 0, tarde: true });
  });
});

describe("pagar un puesto", () => {
  const sale = Date.UTC(2026, 9, 22, 11, 30);
  it("se puede hasta 10 minutos antes de la salida", () => {
    expect(limiteDePago(sale)).toBe(sale - 10 * 60_000);
    expect(puedePagarPuesto(sale, sale - 10 * 60_000)).toBe(true);
    expect(puedePagarPuesto(sale, sale - 9 * 60_000)).toBe(false);
  });
});

describe("suspensiones y recargas", () => {
  it("3, 7, 15 y luego 30 días", () => {
    expect([1, 2, 3, 4, 5].map(diasDeSuspension)).toEqual([3, 7, 15, 30, 30]);
  });

  it("recargas entre $2.000 y $500.000 sin pasar de $1.000.000", () => {
    expect(problemaConRecarga(2000, 0)).toBeNull();
    expect(problemaConRecarga(1999, 0)).toMatch(/2\.000/);
    expect(problemaConRecarga(500001, 0)).toMatch(/500\.000/);
    expect(problemaConRecarga(2500.5, 0)).toMatch(/entre/);
    expect(problemaConRecarga(10000, 995000)).toMatch(/1\.000\.000/);
  });
});
