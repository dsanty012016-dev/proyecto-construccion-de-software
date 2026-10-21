// Pruebas de los cálculos del mapa.
import { describe, expect, it } from "vitest";
import { coordenadaValida, distanciaKm, distanciaTexto, limites, redondear } from "./mapa";

const sede = { lat: 4.121686, lng: -73.615496 };

describe("distancia", () => {
  it("es cero en el mismo punto y simétrica", () => {
    expect(distanciaKm(sede, sede)).toBe(0);
    const otro = { lat: 4.15, lng: -73.63 };
    expect(distanciaKm(sede, otro)).toBeCloseTo(distanciaKm(otro, sede), 10);
  });

  it("un grado de latitud mide unos 111 km", () => {
    expect(distanciaKm({ lat: 4, lng: -73 }, { lat: 5, lng: -73 })).toBeCloseTo(111.19, 1);
  });

  it("se escribe en metros o kilómetros", () => {
    expect(distanciaTexto(0.853)).toBe("850 m");
    expect(distanciaTexto(0.001)).toBe("10 m");
    expect(distanciaTexto(4.23)).toBe("4,2 km");
    expect(distanciaTexto(12)).toBe("12,0 km");
  });
});

describe("coordenadas", () => {
  it("valida rangos y números", () => {
    expect(coordenadaValida(sede)).toBe(true);
    expect(coordenadaValida({ lat: 91, lng: 0 })).toBe(false);
    expect(coordenadaValida({ lat: 0, lng: -181 })).toBe(false);
    expect(coordenadaValida({ lat: Number.NaN, lng: 0 })).toBe(false);
    expect(coordenadaValida(null)).toBe(false);
  });

  it("redondea a 6 decimales", () => {
    expect(redondear({ lat: 4.121686325903587, lng: -73.61549558142269 })).toEqual({ lat: 4.121686, lng: -73.615496 });
  });

  it("calcula la caja que encierra los puntos", () => {
    expect(limites([sede, { lat: 4.15, lng: -73.63 }])).toEqual([
      [-73.63, 4.121686],
      [-73.615496, 4.15],
    ]);
    expect(limites([])).toBeNull();
    expect(limites([{ lat: Number.NaN, lng: 0 }])).toBeNull();
  });
});
