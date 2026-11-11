// Pruebas de las reglas del modo claro y oscuro (tema.ts).
import { describe, expect, it } from "vitest";
import { CLAVE_TEMA, COLOR_BARRA, esTema, otroTema, SCRIPT_TEMA, temaEfectivo } from "./tema";

describe("tema", () => {
  it("solo hay claro y oscuro", () => {
    expect(esTema("claro")).toBe(true);
    expect(esTema("oscuro")).toBe(true);
    expect(esTema("azul")).toBe(false);
    expect(esTema("")).toBe(false);
    expect(esTema(null)).toBe(false);
    expect(esTema(undefined)).toBe(false);
  });

  it("lo que la persona eligió manda sobre el celular", () => {
    expect(temaEfectivo("claro", false)).toBe("claro");
    expect(temaEfectivo("oscuro", true)).toBe("oscuro");
  });

  it("sin elección, o con algo guardado que no sirve, sigue al celular", () => {
    expect(temaEfectivo(null, true)).toBe("claro");
    expect(temaEfectivo(null, false)).toBe("oscuro");
    expect(temaEfectivo("xyz", true)).toBe("claro");
    expect(temaEfectivo("xyz", false)).toBe("oscuro");
  });

  it("el botón pone el modo contrario", () => {
    expect(otroTema("claro")).toBe("oscuro");
    expect(otroTema("oscuro")).toBe("claro");
    expect(otroTema(otroTema("claro"))).toBe("claro");
  });

  it("hay color de barra para los dos modos", () => {
    expect(COLOR_BARRA.claro).toMatch(/^#[0-9a-f]{6}$/);
    expect(COLOR_BARRA.oscuro).toMatch(/^#[0-9a-f]{6}$/);
    expect(COLOR_BARRA.claro).not.toBe(COLOR_BARRA.oscuro);
  });

  it("el código de arranque lee la misma clave y solo acepta los dos modos", () => {
    expect(SCRIPT_TEMA).toContain(`"${CLAVE_TEMA}"`);
    // Se ejecuta con un navegador de mentira para ver qué deja en <html>.
    const correr = (guardado: string | null) => {
      const documento = { documentElement: { dataset: {} as Record<string, string> } };
      const almacen = { getItem: () => guardado };
      new Function("localStorage", "document", SCRIPT_TEMA)(almacen, documento);
      return documento.documentElement.dataset.tema;
    };
    expect(correr("claro")).toBe("claro");
    expect(correr("oscuro")).toBe("oscuro");
    expect(correr("xyz")).toBeUndefined();
    expect(correr(null)).toBeUndefined();
  });

  it("el código de arranque no falla si el navegador bloquea el guardado", () => {
    const almacen = {
      getItem: () => {
        throw new Error("bloqueado");
      },
    };
    const documento = { documentElement: { dataset: {} as Record<string, string> } };
    expect(() => new Function("localStorage", "document", SCRIPT_TEMA)(almacen, documento)).not.toThrow();
  });
});
