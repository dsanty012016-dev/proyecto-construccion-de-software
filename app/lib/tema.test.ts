// Pruebas de las reglas del modo claro y oscuro (tema.ts).
import { describe, expect, it } from "vitest";
import { circuloDeTema, CLAVE_TEMA, COLOR_BARRA, esTema, otroTema, radioParaCubrir, SCRIPT_TEMA, temaEfectivo } from "./tema";

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

  it("el círculo crece hasta la esquina más lejana del botón", () => {
    expect(radioParaCubrir({ x: 0, y: 0 }, 300, 400)).toBe(500);
    expect(radioParaCubrir({ x: 300, y: 400 }, 300, 400)).toBe(500);
    expect(radioParaCubrir({ x: 150, y: 200 }, 300, 400)).toBe(250);
    // Botón arriba a la derecha en un celular: la esquina lejana es abajo a la izquierda.
    expect(radioParaCubrir({ x: 360, y: 30 }, 390, 844)).toBe(Math.ceil(Math.hypot(360, 814)));
  });

  it("escribe el círculo en CSS, sin radios negativos ni decimales", () => {
    expect(circuloDeTema({ x: 340.4, y: 30.6 }, 0)).toBe("circle(0px at 340px 31px)");
    expect(circuloDeTema({ x: 10, y: 20 }, 812.7)).toBe("circle(813px at 10px 20px)");
    expect(circuloDeTema({ x: 10, y: 20 }, -5)).toBe("circle(0px at 10px 20px)");
  });
});
