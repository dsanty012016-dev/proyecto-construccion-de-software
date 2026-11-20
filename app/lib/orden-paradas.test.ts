import { describe, expect, it } from "vitest";
import { compararParadas } from "./orden-paradas";

describe("compararParadas", () => {
  it("compara los tiempos por sentido y estima el aporte de cada parada", () => {
    expect(compararParadas([
      [0, 300, 120, 300],
      [480, 0, 300, 180],
      [120, 240, 0, 300],
      [300, 180, 300, 0],
    ])).toEqual({ orden: [2, 1], segundosActuales: 900, segundosSugeridos: 540, adicionales: [60, 120] });
  });

  it("considera las cuatro plazas del carro y mantiene el inicio y el final", () => {
    const posiciones = [0, 400, 300, 200, 100, 500];
    const tiempos = posiciones.map((a) => posiciones.map((b) => Math.abs(a - b)));
    expect(compararParadas(tiempos)).toMatchObject({ orden: [4, 3, 2, 1], segundosSugeridos: 500 });
  });

  it("mantiene el orden inicial en empate y permite una sola parada", () => {
    const tiempos = Array.from({ length: 4 }, (_, i) => Array.from({ length: 4 }, (_, j) => i === j ? 0 : 60));
    expect(compararParadas(tiempos)).toMatchObject({ orden: [1, 2], segundosActuales: 180, segundosSugeridos: 180 });
    expect(compararParadas([[0, 60, 100], [60, 0, 80], [100, 80, 0]]))
      .toMatchObject({ orden: [1], adicionales: [40] });
  });

  it("descarta órdenes con tramos inaccesibles y omite aportes imposibles de estimar", () => {
    expect(compararParadas([
      [0, 60, null, 60],
      [60, 0, 60, null],
      [60, null, 0, 60],
      [60, 60, 60, 0],
    ])).toMatchObject({ orden: [1, 2], adicionales: [null, null] });
    expect(compararParadas([[0, null, 60], [60, 0, 60], [60, 60, 0]])).toBeNull();
  });
});
