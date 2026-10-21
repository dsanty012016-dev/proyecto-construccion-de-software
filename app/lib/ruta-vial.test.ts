// Pruebas de la consulta y la lectura de rutas por las vías.
import { describe, expect, it } from "vitest";
import { leerRuta, urlRuta } from "./ruta-vial";

const origen = { lat: 4.1420001, lng: -73.6266 };
const sede = { lat: 4.121686325903587, lng: -73.61549558142269 };

describe("urlRuta", () => {
  it("pone lng,lat con 6 decimales y pide la geometría en GeoJSON", () => {
    expect(urlRuta(origen, sede)).toBe(
      "https://routing.openstreetmap.de/routed-car/route/v1/driving/-73.626600,4.142000;-73.615496,4.121686?overview=full&geometries=geojson&alternatives=false&steps=false",
    );
  });
});

describe("leerRuta", () => {
  const buena = {
    code: "Ok",
    routes: [
      {
        distance: 4823.4,
        duration: 690.2,
        geometry: { type: "LineString", coordinates: [[-73.6266, 4.142], [-73.62, 4.13], [-73.6155, 4.1217]] },
      },
    ],
  };

  it("saca coordenadas, kilómetros y minutos", () => {
    const ruta = leerRuta(buena);
    expect(ruta?.coordenadas).toHaveLength(3);
    expect(ruta?.km).toBeCloseTo(4.8234);
    expect(ruta?.minutos).toBe(12);
  });

  it("devuelve null con respuestas inválidas", () => {
    expect(leerRuta(null)).toBeNull();
    expect(leerRuta({ code: "NoRoute", routes: [] })).toBeNull();
    expect(leerRuta({ code: "Ok", routes: [] })).toBeNull();
    expect(leerRuta({ code: "Ok", routes: [{ distance: 1, duration: 1, geometry: { coordinates: [[1, 2]] } }] })).toBeNull();
    expect(leerRuta({ code: "Ok", routes: [{ distance: "x", duration: 1, geometry: { coordinates: [[1, 2], [3, 4]] } }] })).toBeNull();
  });

  it("un viaje muy corto cuenta al menos 1 minuto", () => {
    const corta = { code: "Ok", routes: [{ distance: 50, duration: 8, geometry: { coordinates: [[1, 2], [1.001, 2]] } }] };
    expect(leerRuta(corta)?.minutos).toBe(1);
  });
});
