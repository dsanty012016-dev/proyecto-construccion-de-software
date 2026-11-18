import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
import { modoDeRecarga } from "./pasarela";
beforeEach(() => {
  vi.stubEnv("WOMPI_LLAVE_PUBLICA", "");
  vi.stubEnv("WOMPI_SECRETO_INTEGRIDAD", "");
  vi.stubEnv("UNIGO_RECARGA_SIMULADA", "");
});
afterEach(() => vi.unstubAllEnvs());
describe("modo de recarga explícito", () => {
  it("sin configuración no habilita dinero simulado", () => expect(modoDeRecarga()).toBe("no-disponible"));
  it("la simulación exige activación expresa", () => {
    vi.stubEnv("UNIGO_RECARGA_SIMULADA", "true");
    expect(modoDeRecarga()).toBe("prueba");
  });
  it.each([["pub_test_ficticia", "test_integrity_ficticio", "wompi-pruebas"], ["pub_prod_ficticia", "prod_integrity_ficticio", "wompi"]])("identifica el ambiente de %s", (publica, integridad, modo) => {
    vi.stubEnv("WOMPI_LLAVE_PUBLICA", publica); vi.stubEnv("WOMPI_SECRETO_INTEGRIDAD", integridad);
    expect(modoDeRecarga()).toBe(modo);
  });
  it.each([["pub_test_ficticia", ""], ["", "test_integrity_ficticio"], ["pub_prod_ficticia", "test_integrity_ficticio"], ["incorrecta", "incorrecto"]])("la configuración incompleta no cae en simulación: %s", (publica, integridad) => {
    vi.stubEnv("UNIGO_RECARGA_SIMULADA", "true");vi.stubEnv("WOMPI_LLAVE_PUBLICA", publica);vi.stubEnv("WOMPI_SECRETO_INTEGRIDAD", integridad);
    expect(modoDeRecarga()).toBe("no-disponible");
  });
});
