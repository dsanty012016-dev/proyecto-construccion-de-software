import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const doble = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("./supabase/server", () => ({ crearClienteServidor: async () => ({ rpc: doble.rpc }) }));
import { reportarUbicacion, reportarUbicacionCupo } from "./acciones-seguimiento";

const id = "00000000-0000-4000-8000-000000000001";
const ahora = 1_800_000_000_000;
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(ahora); doble.rpc.mockReset().mockResolvedValue({ error: null }); });
afterEach(() => vi.useRealTimers());
describe("hora de medición del GPS en el servidor", () => {
  it.each([reportarUbicacion, reportarUbicacionCupo])("rechaza una medición antigua sin actualizar la base", async (accion) => {
    expect((await accion(id, { lat: 4.12, lng: -73.61, medidoEn: ahora - 60_000 })).ok).toBe(false);
    expect(doble.rpc).not.toHaveBeenCalled();
  });
  it.each([reportarUbicacion, reportarUbicacionCupo])("acepta una lectura recién medida", async (accion) => {
    expect((await accion(id, { lat: 4.12, lng: -73.61, medidoEn: ahora })).ok).toBe(true);
    expect(doble.rpc).toHaveBeenCalledOnce();
  });
});
