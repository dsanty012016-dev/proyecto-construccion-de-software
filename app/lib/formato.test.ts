// Pruebas del formato de pesos, nombres, tiempos y de la comisión.
import { describe, expect, it } from "vitest";
import { comision, gananciaConductor } from "./comision";
import { calificacionTexto, diaRelativo, etiquetaEstado, fechaCorta, hace, horaCorta, iniciales, nombreCorto, pesos } from "./formato";

describe("pesos", () => {
  it("separa los miles con punto", () => {
    expect(pesos(0)).toBe("$0");
    expect(pesos(950)).toBe("$950");
    expect(pesos(6500)).toBe("$6.500");
    expect(pesos(100000)).toBe("$100.000");
    expect(pesos(1234567)).toBe("$1.234.567");
  });
});

describe("nombres", () => {
  it("saca las iniciales", () => {
    expect(iniciales("Ana María Rojas")).toBe("AR");
    expect(iniciales("camilo")).toBe("C");
    expect(iniciales("   ")).toBe("?");
  });

  it("acorta el nombre para mostrarlo a la otra persona", () => {
    expect(nombreCorto("Ana María Rojas")).toBe("Ana R.");
    expect(nombreCorto("Camilo")).toBe("Camilo");
    expect(nombreCorto("")).toBe("");
  });

  it("escribe la calificación con coma, o Nuevo si no hay", () => {
    expect(calificacionTexto(4.9)).toBe("4,9");
    expect(calificacionTexto(5)).toBe("5,0");
    expect(calificacionTexto(null)).toBe("Nuevo");
  });
});

describe("hace", () => {
  const ahora = 10 * 3600 * 1000;
  it("usa la hora que le pasan", () => {
    expect(hace(ahora - 20 * 1000, ahora)).toBe("ahora");
    expect(hace(ahora - 5 * 60000, ahora)).toBe("5 min");
    expect(hace(ahora - 3 * 3600000, ahora)).toBe("3 h");
    expect(hace(ahora - 2 * 86400000, ahora)).toBe("2 d");
    expect(hace(ahora + 1000, ahora)).toBe("ahora");
  });
});

describe("fechas y estados", () => {
  it("escribe la fecha en hora de Colombia", () => {
    expect(fechaCorta("2026-10-21T16:02:00Z")).toBe("21 oct, 11:02 a. m.");
    expect(fechaCorta("2026-10-21T23:30:00Z")).toBe("21 oct, 6:30 p. m.");
    // Medianoche UTC todavía es el día anterior en Colombia.
    expect(fechaCorta("2026-01-01T03:05:00Z")).toBe("31 dic, 10:05 p. m.");
    expect(fechaCorta("2026-10-21T05:00:00Z")).toBe("21 oct, 12:00 a. m.");
    expect(fechaCorta("no es fecha")).toBe("");
  });

  it("nombra los estados del viaje", () => {
    expect(etiquetaEstado("solicitado")).toBe("Buscando conductor");
    expect(etiquetaEstado("aceptado")).toBe("Conductor en camino");
    expect(etiquetaEstado("cancelado")).toBe("Cancelado");
  });
});

describe("comisión del 10 %", () => {
  it("descuenta el 10 % al conductor", () => {
    expect(comision(6500)).toBe(650);
    expect(gananciaConductor(6500)).toBe(5850);
    expect(gananciaConductor(1000)).toBe(900);
  });

  it("siempre suma el precio exacto", () => {
    for (const precio of [1000, 1005, 6500, 7333, 99999, 100000]) {
      expect(comision(precio) + gananciaConductor(precio)).toBe(precio);
    }
  });
});

describe("hora y día en Colombia", () => {
  // 22 oct 2026, 9:00 a. m. en Colombia.
  const ahora = Date.parse("2026-10-22T14:00:00Z");

  it("da la hora corta con a. m. / p. m.", () => {
    expect(horaCorta("2026-10-22T11:30:00Z")).toEqual({ hora: "6:30", periodo: "a. m." });
    expect(horaCorta("2026-10-22T17:05:00Z")).toEqual({ hora: "12:05", periodo: "p. m." });
    expect(horaCorta("no es fecha")).toEqual({ hora: "", periodo: "" });
  });

  it("nombra el día frente a ahora, con el corte a medianoche de Colombia", () => {
    expect(diaRelativo("2026-10-22T20:00:00Z", ahora)).toBe("Hoy");
    expect(diaRelativo("2026-10-23T04:59:00Z", ahora)).toBe("Hoy"); // 11:59 p. m. del 22
    expect(diaRelativo("2026-10-23T05:00:00Z", ahora)).toBe("Mañana");
    expect(diaRelativo("2026-10-21T12:00:00Z", ahora)).toBe("Ayer");
    expect(diaRelativo("2026-10-29T12:00:00Z", ahora)).toBe("29 oct");
  });
});
