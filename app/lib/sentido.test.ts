// Pruebas de ida y regreso (las mismas reglas de 017-viaje-de-regreso.sql).
import { describe, expect, it } from "vitest";
import { cercaDeLaU, esSentido, extremos, problemaConPuntos, puntoDeLaCasa, recorridoDelPuesto, textoEnLaU } from "./sentido";

const sede = { lat: 4.121686, lng: -73.615496 };
const casa = { lat: 4.15, lng: -73.64, texto: "Barzal" };
const u = { ...sede, texto: "USTA Villavicencio" };

describe("sentido", () => {
  it("solo hay ida y regreso", () => {
    expect(esSentido("ida")).toBe(true);
    expect(esSentido("regreso")).toBe(true);
    expect(esSentido("vuelta")).toBe(false);
    expect(esSentido(undefined)).toBe(false);
  });

  it("la ida va de la casa a la U y el regreso al revés", () => {
    expect(extremos("ida", casa, u)).toEqual({ origen: casa, destino: u });
    expect(extremos("regreso", casa, u)).toEqual({ origen: u, destino: casa });
  });

  it("el punto de la U puede moverse hasta 500 m de la sede", () => {
    expect(cercaDeLaU(sede, sede)).toBe(true);
    // 0,004° de latitud ≈ 445 m; 0,005° ≈ 556 m.
    expect(cercaDeLaU({ lat: sede.lat + 0.004, lng: sede.lng }, sede)).toBe(true);
    expect(cercaDeLaU({ lat: sede.lat + 0.005, lng: sede.lng }, sede)).toBe(false);
  });

  it("revisa los puntos en el mismo orden que la base", () => {
    expect(problemaConPuntos(casa, sede, sede)).toBeNull();
    expect(problemaConPuntos(casa, { lat: 4.14, lng: -73.63 }, sede)).toMatch(/500 m/);
    expect(problemaConPuntos({ lat: sede.lat + 0.0005, lng: sede.lng }, sede, sede)).toMatch(/es la universidad/);
  });

  it("el texto de la U lleva la referencia si la hay", () => {
    expect(textoEnLaU("USTA Villavicencio")).toBe("USTA Villavicencio");
    expect(textoEnLaU("USTA Villavicencio", " portería de la 40 ")).toBe("USTA Villavicencio (portería de la 40)");
    expect(textoEnLaU("USTA Villavicencio", "  ")).toBe("USTA Villavicencio");
  });

  it("el punto de la casa cambia de lado según el sentido", () => {
    expect(puntoDeLaCasa({ sentido: "ida", origen_texto: "Barzal", destino_texto: "USTA" })).toBe("Barzal");
    expect(puntoDeLaCasa({ sentido: "regreso", origen_texto: "USTA", destino_texto: "Barzal" })).toBe("Barzal");
  });

  it("el recorrido del puesto va de la recogida a la U o de la U a la bajada", () => {
    const ida = { sentido: "ida" as const, salida_texto: "Porfía", destino_texto: "USTA" };
    const regreso = { sentido: "regreso" as const, salida_texto: "USTA", destino_texto: "Porfía" };
    expect(recorridoDelPuesto(ida, "Cra 30")).toEqual({ origen: "Cra 30", destino: "USTA" });
    expect(recorridoDelPuesto(regreso, "Cra 30")).toEqual({ origen: "USTA", destino: "Cra 30" });
    expect(recorridoDelPuesto(regreso, null)).toEqual({ origen: "USTA", destino: "Porfía" });
  });
});
