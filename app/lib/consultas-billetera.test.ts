import { beforeEach, describe, expect, it, vi } from "vitest";
type Respuesta = { data: unknown; error: unknown; count?: number };
const dobles = vi.hoisted(() => ({ resultados: {} as Record<string, Respuesta>, consultas: [] as { tabla: string; metodos: string[] }[] }));
vi.mock("server-only", () => ({}));
vi.mock("./supabase/server", () => ({ crearClienteServidor: async () => ({ from: (tabla: string) => {
  const registro = { tabla, metodos: [] as string[] }; dobles.consultas.push(registro);
  const consulta: Record<string, unknown> = {};
  for (const metodo of ["select", "eq", "gt", "order", "limit", "range"]) consulta[metodo] = () => { registro.metodos.push(metodo); return consulta; };
  consulta.maybeSingle = async () => dobles.resultados[tabla];
  consulta.then = (resolver: (r: Respuesta) => unknown) => Promise.resolve(dobles.resultados[tabla]).then(resolver);
  return consulta;
} }) }));
import { historialDeFaltas, miBilletera, miRecarga, recargasEnProceso } from "./consultas-billetera";

beforeEach(() => {
  dobles.consultas.length = 0;
  dobles.resultados = { billeteras: { data: { saldo: 45000 }, error: null }, movimientos: { data: [], error: null }, recargas: { data: [], error: null } };
});
describe("consultar dinero", () => {
  it("un fallo al leer el saldo nunca se presenta como cero", async () => {
    dobles.resultados.billeteras = { data: null, error: { message: "Sin conexión" } };
    await expect(miBilletera("persona")).rejects.toThrow("No pudimos cargar tu billetera");
  });
  it("un fallo en movimientos nunca se presenta como historial vacío", async () => {
    dobles.resultados.movimientos = { data: null, error: { message: "Sin conexión" } };
    await expect(miBilletera("persona")).rejects.toThrow("No pudimos cargar tu billetera");
  });
  it("una billetera que aún no existe sí tiene saldo cero", async () => {
    dobles.resultados.billeteras = { data: null, error: null };
    expect(await miBilletera("persona")).toMatchObject({ saldo: 0, movimientos: [] });
  });
  it("una recarga que no se pudo consultar no parece inexistente", async () => {
    dobles.resultados.recargas = { data: null, error: { message: "Sin conexión" } };
    await expect(miRecarga("referencia")).rejects.toThrow("No pudimos consultar");
  });
  it("los pendientes no tienen un filtro de edad que esconda pagos demorados", async () => {
    await recargasEnProceso("persona");
    expect(dobles.consultas[0].metodos).not.toContain("gt");
  });
  it("un error de recargas pendientes tampoco se oculta", async () => {
    dobles.resultados.recargas = { data: null, error: { message: "Sin conexión" } };
    await expect(recargasEnProceso("persona")).rejects.toThrow("No pudimos consultar");
  });
});

describe("historial de faltas", () => {
  it("distingue un fallo de consulta de un historial sin faltas", async () => {
    dobles.resultados.strikes = { data: null, error: { message: "Sin conexión" } };
    await expect(historialDeFaltas("persona", 1)).rejects.toThrow("No pudimos consultar tu historial de faltas.");
    dobles.resultados.strikes = { data: [], error: null, count: 0 };
    await expect(historialDeFaltas("persona", 1)).resolves.toEqual({ faltas: [], total: 0 });
  });
});
