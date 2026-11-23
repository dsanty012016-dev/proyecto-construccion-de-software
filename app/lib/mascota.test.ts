import { describe, expect, it } from "vitest";
import {
  consejoDelMomento,
  debeMostrarConsejo,
  diaEnColombia,
  esIdLogro,
  expresionPorHora,
  logrosAlcanzados,
  logrosPorCelebrar,
  primerNombre,
} from "./mascota";

// Horas en UTC: Colombia es UTC-5, así que 10:00Z son las 5:00 a.m. allá.
const colombia = (h: number, m = 0) => new Date(Date.UTC(2026, 10, 23, h + 5, m));

describe("expresionPorHora", () => {
  it("tiene sueño de madrugada, antes de las 6", () => {
    expect(expresionPorHora(colombia(5, 20))).toBe("sueno");
    expect(expresionPorHora(colombia(0, 30))).toBe("sueno");
  });
  it("está tranquilo desde las 6", () => {
    expect(expresionPorHora(colombia(6))).toBe("normal");
    expect(expresionPorHora(colombia(15))).toBe("normal");
  });
});

describe("primerNombre", () => {
  it("toma solo el primer nombre", () => {
    expect(primerNombre("  Laura María Gómez ")).toBe("Laura");
  });
  it("sin nombre queda vacío", () => {
    expect(primerNombre(null)).toBe("");
    expect(primerNombre("   ")).toBe("");
  });
});

describe("consejoDelMomento", () => {
  it("de noche cerrada no molesta", () => {
    expect(consejoDelMomento("estudiante", colombia(2))).toBeNull();
    expect(consejoDelMomento("conductor", colombia(23, 30))).toBeNull();
  });
  it("al estudiante en la mañana le sugiere pedir viaje", () => {
    expect(consejoDelMomento("estudiante", colombia(7))?.accion.ruta).toBe("/estudiante/pedir?sentido=ida");
  });
  it("al estudiante en la tarde le sugiere cupos de regreso", () => {
    expect(consejoDelMomento("estudiante", colombia(14))?.accion.ruta).toBe("/estudiante/cupos?sentido=regreso");
  });
  it("al estudiante en la noche le sugiere apartar cupo para mañana", () => {
    expect(consejoDelMomento("estudiante", colombia(20))?.accion.ruta).toBe("/estudiante/cupos?sentido=ida");
  });
  it("al conductor siempre lo lleva a publicar un cupo", () => {
    for (const h of [7, 14, 20]) expect(consejoDelMomento("conductor", colombia(h))?.accion.ruta).toBe("/conductor/cupo/nuevo");
  });
});

describe("consejo una vez al día", () => {
  it("usa el día de Colombia, no el de UTC", () => {
    expect(diaEnColombia(new Date(Date.UTC(2026, 10, 24, 3)))).toBe("2026-11-23");
  });
  it("sale si nunca salió o salió otro día", () => {
    expect(debeMostrarConsejo(null, colombia(8))).toBe(true);
    expect(debeMostrarConsejo("2026-11-22", colombia(8))).toBe(true);
  });
  it("no sale dos veces el mismo día", () => {
    expect(debeMostrarConsejo("2026-11-23", colombia(20))).toBe(false);
  });
});

describe("logros", () => {
  const nada = { viajesEstudiante: 0, viajesConductor: 0, cincoEstrellas: 0 };

  it("sin viajes no hay logros", () => {
    expect(logrosAlcanzados(nada, "estudiante")).toEqual([]);
  });
  it("el primer viaje y los 10 viajes van por rol", () => {
    const conteo = { viajesEstudiante: 10, viajesConductor: 1, cincoEstrellas: 0 };
    expect(logrosAlcanzados(conteo, "estudiante")).toEqual(["primer_viaje_estudiante", "diez_viajes_estudiante"]);
    expect(logrosAlcanzados(conteo, "conductor")).toEqual(["primer_viaje_conductor"]);
  });
  it("las primeras 5 estrellas cuentan en cualquier rol", () => {
    expect(logrosAlcanzados({ ...nada, cincoEstrellas: 2 }, "conductor")).toEqual(["primeras_cinco_estrellas"]);
  });
  it("no repite los ya celebrados", () => {
    expect(logrosPorCelebrar(["primer_viaje_estudiante", "primeras_cinco_estrellas"], ["primer_viaje_estudiante"])).toEqual([
      "primeras_cinco_estrellas",
    ]);
  });
  it("solo acepta identificadores conocidos", () => {
    expect(esIdLogro("diez_viajes_conductor")).toBe(true);
    expect(esIdLogro("mil_viajes")).toBe(false);
    expect(esIdLogro(3)).toBe(false);
  });
});
