// Pruebas de los filtros de "Mis viajes" (historial.ts).
import { describe, expect, it } from "vitest";
import { enlaceDeFiltro, filtrarHistorial, porCalificar, SIN_FILTRO, type Filtro } from "./historial";

// Elementos mínimos con un número para reconocerlos en el resultado.
const viaje = (n: number, estado: "terminado" | "cancelado", calificado: boolean) => ({
  n,
  tipo: "viaje" as const,
  dato: { viaje: { estado }, calificado },
});
const cupo = (n: number, estado: "terminado" | "cancelado", porCalificar: boolean) => ({
  n,
  tipo: "cupo" as const,
  dato: { cupo: { estado }, porCalificar },
});

type Prueba = ReturnType<typeof viaje> | ReturnType<typeof cupo>;

// La lista del ejemplo, ya ordenada (más reciente primero).
const lista: Prueba[] = [viaje(1, "terminado", false), cupo(2, "terminado", false), viaje(3, "cancelado", false), cupo(4, "cancelado", false)];

/** Los números de lo que deja el filtro, en el orden en que quedan. */
const numeros = (filtro: Filtro, items: Prueba[] = lista) => filtrarHistorial(items, filtro).map((i) => i.n);

describe("filtrarHistorial", () => {
  it("sin filtros deja todo", () => {
    expect(numeros(SIN_FILTRO)).toEqual([1, 2, 3, 4]);
  });

  it("por tipo: pedido o cupo", () => {
    expect(numeros({ ...SIN_FILTRO, tipo: "pedido" })).toEqual([1, 3]);
    expect(numeros({ ...SIN_FILTRO, tipo: "cupo" })).toEqual([2, 4]);
  });

  it("por estado", () => {
    expect(numeros({ ...SIN_FILTRO, estado: "cancelado" })).toEqual([3, 4]);
    expect(numeros({ ...SIN_FILTRO, estado: "terminado" })).toEqual([1, 2]);
  });

  it("solo lo que falta calificar", () => {
    expect(numeros({ ...SIN_FILTRO, pendientes: true })).toEqual([1]);
  });

  it("los filtros se combinan", () => {
    expect(numeros({ tipo: "cupo", estado: "terminado", pendientes: true })).toEqual([]);
    expect(numeros({ tipo: "pedido", estado: "terminado", pendientes: true })).toEqual([1]);
    expect(numeros({ tipo: "todos", estado: "cancelado", pendientes: true })).toEqual([]);
  });

  it("no cambia el orden ni la lista original", () => {
    const desordenada = [cupo(9, "terminado", true), viaje(5, "terminado", false), cupo(7, "terminado", true)];
    expect(numeros({ ...SIN_FILTRO, pendientes: true }, desordenada)).toEqual([9, 5, 7]);
    expect(desordenada.map((i) => i.n)).toEqual([9, 5, 7]);
  });

  it("devuelve los mismos objetos, no copias", () => {
    expect(filtrarHistorial(lista, SIN_FILTRO)[0]).toBe(lista[0]);
  });

  it("una lista vacía da una lista vacía", () => {
    expect(filtrarHistorial([], { tipo: "cupo", estado: "terminado", pendientes: true })).toEqual([]);
  });
});

describe("porCalificar", () => {
  it("un viaje terminado sin calificar falta; uno calificado no", () => {
    expect(porCalificar(viaje(1, "terminado", false))).toBe(true);
    expect(porCalificar(viaje(1, "terminado", true))).toBe(false);
  });

  it("un cupo terminado depende de porCalificar", () => {
    expect(porCalificar(cupo(1, "terminado", true))).toBe(true);
    expect(porCalificar(cupo(1, "terminado", false))).toBe(false);
  });

  it("lo cancelado nunca falta por calificar, aunque el dato diga otra cosa", () => {
    expect(porCalificar(viaje(1, "cancelado", false))).toBe(false);
    expect(porCalificar(cupo(1, "cancelado", true))).toBe(false);
  });
});

describe("enlaceDeFiltro", () => {
  it("sin filtros es /viajes", () => {
    expect(enlaceDeFiltro(SIN_FILTRO)).toBe("/viajes");
  });

  it("lleva solo lo que no está en todos", () => {
    expect(enlaceDeFiltro({ ...SIN_FILTRO, tipo: "pedido" })).toBe("/viajes?tipo=pedido");
    expect(enlaceDeFiltro({ ...SIN_FILTRO, pendientes: true })).toBe("/viajes?pendientes=1");
    expect(enlaceDeFiltro({ tipo: "cupo", estado: "terminado", pendientes: true })).toBe("/viajes?tipo=cupo&estado=terminado&pendientes=1");
  });
});
