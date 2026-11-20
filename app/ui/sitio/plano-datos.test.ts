// Pruebas de los datos y cálculos del plano de la portada.
import { describe, expect, it } from "vitest";
import { BARRIO_INICIAL, BARRIOS, barrioPorNombre, cajaDe, rutaHasta, SALIDAS_EJEMPLO, SEDE } from "./plano-datos";

describe("barrios de la portada", () => {
  it("cada ruta sale de su barrio y termina en la sede", () => {
    for (const barrio of BARRIOS) {
      const [lngI, latI] = barrio.ruta[0];
      const [lngF, latF] = barrio.ruta[barrio.ruta.length - 1];
      expect(Math.abs(lngI - barrio.punto.lng)).toBeLessThan(0.005);
      expect(Math.abs(latI - barrio.punto.lat)).toBeLessThan(0.005);
      expect(lngF).toBeCloseTo(SEDE.lng, 4);
      expect(latF).toBeCloseTo(SEDE.lat, 4);
    }
  });

  it("el barrio inicial y los de las salidas de ejemplo existen", () => {
    expect(barrioPorNombre(BARRIO_INICIAL).nombre).toBe(BARRIO_INICIAL);
    for (const salida of SALIDAS_EJEMPLO) expect(BARRIOS.some((b) => b.nombre === salida.barrio)).toBe(true);
  });

  it("un nombre desconocido devuelve el primer barrio", () => {
    expect(barrioPorNombre("Otro").nombre).toBe(BARRIOS[0].nombre);
  });
});

describe("cajaDe", () => {
  it("encierra todos los puntos", () => {
    expect(cajaDe([[1, 2], [-3, 5], [0, -1]])).toEqual([[-3, -1], [1, 5]]);
  });
});

describe("rutaHasta", () => {
  const ruta: [number, number][] = [[0, 0], [1, 0], [1, 1]];

  it("en 0 queda solo el inicio y en 1 la ruta completa", () => {
    expect(rutaHasta(ruta, 0)).toEqual([[0, 0], [0, 0]]);
    expect(rutaHasta(ruta, 1)).toEqual(ruta);
  });

  it("a la mitad del largo corta en la esquina", () => {
    expect(rutaHasta(ruta, 0.5)).toEqual([[0, 0], [1, 0]]);
  });

  it("a un cuarto corta en medio del primer tramo", () => {
    expect(rutaHasta(ruta, 0.25)).toEqual([[0, 0], [0.5, 0]]);
  });
});
