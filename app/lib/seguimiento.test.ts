import { describe, expect, it } from "vitest";
import { enlaceCompartido, INTERVALO_UBICACION_MS, textoUbicacion, tocaEnviar, tokenValido, viajeSeSigue } from "./seguimiento";

describe("seguimiento en vivo", () => {
  it("manda la primera ubicación y luego cada 5 segundos", () => {
    expect(tocaEnviar(null, 1000)).toBe(true);
    expect(tocaEnviar(1000, 1000 + INTERVALO_UBICACION_MS - 1)).toBe(false);
    expect(tocaEnviar(1000, 1000 + INTERVALO_UBICACION_MS)).toBe(true);
  });

  it("solo se sigue un viaje aceptado o en curso", () => {
    expect(viajeSeSigue("aceptado")).toBe(true);
    expect(viajeSeSigue("en_curso")).toBe(true);
    expect(viajeSeSigue("solicitado")).toBe(false);
    expect(viajeSeSigue("terminado")).toBe(false);
    expect(viajeSeSigue("cancelado")).toBe(false);
  });

  it("dice qué tan reciente es la ubicación", () => {
    const ahora = 1_000_000;
    expect(textoUbicacion(null, ahora)).toBe("Esperando la ubicación del conductor");
    expect(textoUbicacion(ahora - 5_000, ahora)).toBe("Ubicación en vivo");
    expect(textoUbicacion(ahora - 30_000, ahora)).toBe("Ubicación en vivo");
    expect(textoUbicacion(ahora - 45_000, ahora)).toBe("Última ubicación hace 45 s");
    expect(textoUbicacion(ahora - 5 * 60_000, ahora)).toBe("Última ubicación hace 5 min");
    expect(textoUbicacion(ahora + 3_000, ahora)).toBe("Ubicación en vivo");
  });
});

describe("enlace para compartir", () => {
  it("acepta solo tokens de 64 caracteres hexadecimales", () => {
    expect(tokenValido("a".repeat(64))).toBe(true);
    expect(tokenValido("A".repeat(64))).toBe(false);
    expect(tokenValido("a".repeat(63))).toBe(false);
    expect(tokenValido("../" + "a".repeat(61))).toBe(false);
  });

  it("arma la dirección completa", () => {
    const token = "b".repeat(64);
    expect(enlaceCompartido("https://unigo.app", token)).toBe(`https://unigo.app/compartido/${token}`);
    expect(enlaceCompartido("http://localhost:3000/", token)).toBe(`http://localhost:3000/compartido/${token}`);
  });
});
