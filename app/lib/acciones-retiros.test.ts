import { beforeEach, describe, expect, it, vi } from "vitest";
import { ESTADO_INICIAL } from "./estado-formulario";
const dobles = vi.hoisted(() => ({ rpc: vi.fn(), redirect: vi.fn(), revalidate: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: dobles.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: dobles.revalidate }));
vi.mock("./supabase/server", () => ({ crearClienteServidor: async () => ({ rpc: dobles.rpc }) }));
import { revisarRetiro, solicitarRetiro } from "./acciones-retiros";
function formulario(datos: Record<string, string>) { const form = new FormData(); for (const [k, v] of Object.entries(datos)) form.set(k, v); return form; }
beforeEach(() => { vi.resetAllMocks(); dobles.rpc.mockResolvedValue({ error: null }); dobles.redirect.mockImplementation(() => { throw new Error("REDIRECT"); }); });
describe("acciones de retiros", () => {
  it("no llama a la base con un monto bajo", async () => {
    expect((await solicitarRetiro(ESTADO_INICIAL, formulario({ monto: "19999", nequi: "3001112233" }))).resultado).toBe("error");
    expect(dobles.rpc).not.toHaveBeenCalled();
  });
  it("envía el importe y el Nequi normalizados y actualiza la billetera", async () => {
    await expect(solicitarRetiro(ESTADO_INICIAL, formulario({ monto: "20000", nequi: "+57 3001112233" }))).rejects.toThrow("REDIRECT");
    expect(dobles.rpc).toHaveBeenCalledWith("solicitar_retiro", { p_monto: 20000, p_nequi: "3001112233" });
  });
  it("no anuncia éxito si la base rechaza la reserva", async () => {
    dobles.rpc.mockResolvedValue({ error: { code: "P0001", message: "No tienes ganancias." } });
    expect(await solicitarRetiro(ESTADO_INICIAL, formulario({ monto: "20000", nequi: "3001112233" }))).toMatchObject({ resultado: "error", mensaje: "No tienes ganancias." });
    expect(dobles.redirect).not.toHaveBeenCalled();
  });
  it("exige revisión de documentos antes de registrar el pago", async () => {
    const respuesta = await revisarRetiro(ESTADO_INICIAL, formulario({ retiro: "a532a445-1dc5-4e52-b715-134ef6719da0", resultado: "pagado", referencia: "NEQUI-123" }));
    expect(respuesta.errores?.documentos).toBeTruthy(); expect(dobles.rpc).not.toHaveBeenCalled();
  });
});
