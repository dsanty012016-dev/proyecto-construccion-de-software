// Pruebas de las reglas puras de los cupos.
import { describe, expect, it } from "vitest";
import { avanceEnTramo, distanciaATramoKm, esMoto, etiquetaPuesto, horaLocalAIso, ordenarRecogidas, puestosLibres, puestosMaximos, salidaValida } from "./cupo";

describe("vehículo y puestos", () => {
  it("reconoce la placa de moto", () => {
    expect(esMoto("ABC12D")).toBe(true);
    expect(esMoto("abc12d")).toBe(true);
    expect(esMoto("ABC123")).toBe(false);
  });

  it("moto 1 puesto, carro hasta 4", () => {
    expect(puestosMaximos("XYZ12D")).toBe(1);
    expect(puestosMaximos("ABC123")).toBe(4);
  });

  it("cuenta los puestos libres sin bajar de cero", () => {
    expect(puestosLibres(3, 1)).toBe(2);
    expect(puestosLibres(2, 2)).toBe(0);
    expect(puestosLibres(1, 3)).toBe(0);
  });
});

describe("hora de salida", () => {
  const ahora = Date.UTC(2026, 9, 21, 15, 0);

  it("debe ser entre 15 minutos y 7 días desde ahora", () => {
    expect(salidaValida(ahora + 15 * 60_000, ahora)).toBe(true);
    expect(salidaValida(ahora + 14 * 60_000, ahora)).toBe(false);
    expect(salidaValida(ahora + 7 * 86_400_000, ahora)).toBe(true);
    expect(salidaValida(ahora + 7 * 86_400_000 + 1, ahora)).toBe(false);
    expect(salidaValida(Number.NaN, ahora)).toBe(false);
  });

  it("convierte la hora de Colombia a ISO", () => {
    expect(horaLocalAIso("2026-10-22T06:30")).toBe("2026-10-22T11:30:00.000Z");
    expect(horaLocalAIso("2026-12-31T21:15")).toBe("2027-01-01T02:15:00.000Z");
  });

  it("rechaza horas mal escritas o que no existen", () => {
    expect(horaLocalAIso("")).toBeNull();
    expect(horaLocalAIso("2026-02-31T06:30")).toBeNull();
    expect(horaLocalAIso("2026-10-22T25:00")).toBeNull();
    expect(horaLocalAIso("22/10/2026 6:30")).toBeNull();
  });
});

describe("distancia al tramo", () => {
  const a = { lat: 4.15, lng: -73.64 };
  const b = { lat: 4.12, lng: -73.61 };

  it("es cero sobre el tramo y en sus puntas", () => {
    expect(distanciaATramoKm(a, a, b)).toBeCloseTo(0, 6);
    expect(distanciaATramoKm({ lat: 4.135, lng: -73.625 }, a, b)).toBeCloseTo(0, 3);
  });

  it("mide hasta la punta más cercana si el punto queda antes o después", () => {
    const antes = { lat: 4.16, lng: -73.64 };
    expect(distanciaATramoKm(antes, a, b)).toBeCloseTo(1.113, 2);
  });

  it("funciona si el tramo es un solo punto", () => {
    expect(distanciaATramoKm({ lat: 4.16, lng: -73.64 }, a, a)).toBeCloseTo(1.113, 2);
  });
});

describe("estados del puesto", () => {
  it("tienen nombre para la pantalla", () => {
    expect(etiquetaPuesto("pendiente")).toBe("Esperando al conductor");
    expect(etiquetaPuesto("aprobado")).toBe("Puesto aprobado");
  });
});

describe("orden de recogida", () => {
  // Salida al norte de la ciudad, la U al sur.
  const salida = { lat: 4.16, lng: -73.64 };
  const destino = { lat: 4.08, lng: -73.6 };

  it("mide el avance de 0 (salida) a 1 (destino)", () => {
    expect(avanceEnTramo(salida, salida, destino)).toBe(0);
    expect(avanceEnTramo(destino, salida, destino)).toBe(1);
    expect(avanceEnTramo({ lat: 4.12, lng: -73.62 }, salida, destino)).toBeCloseTo(0.5, 2);
    // Antes de la salida o después del destino se queda en los extremos.
    expect(avanceEnTramo({ lat: 4.3, lng: -73.7 }, salida, destino)).toBe(0);
    expect(avanceEnTramo({ lat: 4.0, lng: -73.55 }, salida, destino)).toBe(1);
  });

  it("ordena de la salida hacia la U y respeta el orden de llegada en empates", () => {
    const lista = [
      { id: "c", recogida: { lat: 4.09, lng: -73.605 } },
      { id: "a", recogida: { lat: 4.155, lng: -73.638 } },
      { id: "b", recogida: { lat: 4.12, lng: -73.62 } },
      { id: "b2", recogida: { lat: 4.12, lng: -73.62 } },
    ];
    expect(ordenarRecogidas(salida, destino, lista).map((x) => x.id)).toEqual(["a", "b", "b2", "c"]);
    expect(lista[0].id).toBe("c");
  });

  it("con salida y destino iguales no se rompe", () => {
    expect(ordenarRecogidas(salida, salida, [{ recogida: destino }, { recogida: salida }])).toHaveLength(2);
  });
});
