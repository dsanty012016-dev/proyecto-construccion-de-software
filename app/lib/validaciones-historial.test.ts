// Pruebas de la lectura de los filtros de "Mis viajes" desde la URL.
import { describe, expect, it } from "vitest";
import { SIN_FILTRO } from "./historial";
import { leerFiltro, volverDelComprobante } from "./validaciones-historial";

describe("leerFiltro", () => {
  it("sin parámetros no filtra nada", () => {
    expect(leerFiltro({})).toEqual(SIN_FILTRO);
  });

  it("lee los tres filtros juntos", () => {
    expect(leerFiltro({ tipo: "cupo", estado: "terminado", pendientes: "1" })).toEqual({
      tipo: "cupo",
      estado: "terminado",
      pendientes: true,
    });
  });

  it("lo desconocido o vacío cuenta como todos y nunca da error", () => {
    expect(leerFiltro({ tipo: "xyz", pendientes: "talvez" })).toEqual(SIN_FILTRO);
    expect(leerFiltro({ tipo: "", estado: "", pendientes: "" })).toEqual(SIN_FILTRO);
    expect(leerFiltro({ estado: "TERMINADO", pendientes: "true" })).toEqual(SIN_FILTRO);
  });

  it("un valor repetido en la URL (llega como lista) cuenta como todos", () => {
    expect(leerFiltro({ tipo: ["cupo", "pedido"], pendientes: ["1", "1"] })).toEqual(SIN_FILTRO);
  });

  it("un filtro malo no daña los demás", () => {
    expect(leerFiltro({ tipo: "pedido", estado: "xyz" })).toEqual({ tipo: "pedido", estado: "todos", pendientes: false });
  });

  it("ignora parámetros que no son filtros", () => {
    expect(leerFiltro({ otro: "1", estado: "cancelado" })).toEqual({ ...SIN_FILTRO, estado: "cancelado" });
  });
});

describe("volver desde un detalle", () => {
  it("conserva los filtros y la página del historial o regresa a Billetera", () => {
    expect(volverDelComprobante({ volver: "/viajes?tipo=cupo&pagina=3" })).toBe("/viajes?tipo=cupo&pagina=3");
    expect(volverDelComprobante({ volver: "/billetera" })).toBe("/billetera");
  });

  it("acepta únicamente destinos del historial o Billetera", () => {
    expect(volverDelComprobante({ volver: "/viajes/cupo/otro" })).toBe("/viajes");
    expect(volverDelComprobante({ volver: ["/billetera", "/viajes"] })).toBe("/viajes");
  });
});
