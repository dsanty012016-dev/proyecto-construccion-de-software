import { describe, expect, it } from "vitest";
import { precioSugeridoPuesto, precioSugeridoViaje } from "./precio-sugerido";

describe("precio sugerido", () => {
  it("viaje: base $1.800 + $800 por km, redondeado a $100", () => {
    expect(precioSugeridoViaje(2)).toBe(3_400);
    expect(precioSugeridoViaje(5)).toBe(5_800);
    expect(precioSugeridoViaje(10)).toBe(9_800);
    expect(precioSugeridoViaje(3.26)).toBe(4_400);
  });

  it("puesto de cupo: base $1.000 + $450 por km", () => {
    expect(precioSugeridoPuesto(5)).toBe(3_300); // 3.250 redondea a 3.300
    expect(precioSugeridoPuesto(2)).toBe(1_900);
  });

  it("sin distancia usable no sugiere nada", () => {
    expect(precioSugeridoViaje(0)).toBeNull();
    expect(precioSugeridoViaje(-1)).toBeNull();
    expect(precioSugeridoPuesto(Number.NaN)).toBeNull();
  });
});
