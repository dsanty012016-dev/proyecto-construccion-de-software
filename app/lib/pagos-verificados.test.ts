import { describe, expect, it, vi } from "vitest";
import { EventoInvalido, manejadorDePagos } from "../../supabase/functions/confirmar-pago/procesar";

const aviso = { transaccion: "tx-123", ambiente: "test" as const };
const transaccion = { id: "tx-123", reference: "referencia-del-proveedor", status: "APPROVED", amount_in_cents: 2000000, currency: "COP", payment_method_type: "NEQUI" };
function preparar() {
  const validar = vi.fn(async () => aviso as typeof aviso | null);
  const confirmar = vi.fn(async () => "aprobada");
  const consultar = vi.fn<typeof fetch>(async () => Response.json({ data: transaccion }));
  const manejar = manejadorDePagos({ validar, confirmar, consultar, llavePrivada: () => "prv_test_valor_ficticio" });
  const peticion = (datos: unknown = { referencia: "no-confiable" }) => new Request("https://unigo.test/pago", { method: "POST", body: JSON.stringify(datos) });
  return { manejar, validar, confirmar, consultar, peticion };
}
describe("confirmación de pagos en el servidor", () => {
  it("consulta por ID y pasa la referencia del proveedor, no la del aviso", async () => {
    const p = preparar();
    expect((await p.manejar(p.peticion())).status).toBe(200);
    expect(p.consultar).toHaveBeenCalledWith("https://sandbox.wompi.co/v1/transactions/tx-123", expect.objectContaining({ redirect: "error", headers: expect.objectContaining({ Authorization: "Bearer prv_test_valor_ficticio" }) }));
    expect(p.confirmar).toHaveBeenCalledWith({ referencia: "no-confiable" }, transaccion);
  });
  it("no consulta ni acredita una firma inválida", async () => {
    const p = preparar(); p.validar.mockRejectedValue(new EventoInvalido());
    expect((await p.manejar(p.peticion())).status).toBe(400);
    expect(p.consultar).not.toHaveBeenCalled(); expect(p.confirmar).not.toHaveBeenCalled();
  });
  it("ignora eventos de otro tipo sin consultar al proveedor", async () => {
    const p = preparar(); p.validar.mockResolvedValue(null);
    expect((await p.manejar(p.peticion())).status).toBe(200); expect(p.consultar).not.toHaveBeenCalled();
  });
  it.each([401, 404, 429, 500])("pide reintento si el proveedor devuelve %i", async (status) => {
    const p = preparar(); p.consultar.mockResolvedValue(new Response("", { status }));
    expect((await p.manejar(p.peticion())).status).toBe(503); expect(p.confirmar).not.toHaveBeenCalled();
  });
  it("rechaza una respuesta para otra transacción", async () => {
    const p = preparar(); p.consultar.mockResolvedValue(Response.json({ data: { ...transaccion, id: "otra" } }));
    expect((await p.manejar(p.peticion())).status).toBe(503); expect(p.confirmar).not.toHaveBeenCalled();
  });
  it("un fallo en la base después de consultar no anuncia recepción correcta", async () => {
    const p = preparar(); p.confirmar.mockRejectedValue(new Error("Base no disponible"));
    expect((await p.manejar(p.peticion())).status).toBe(503);
  });
  it("no acepta el host o ruta dentro del ID del aviso", async () => {
    const p = preparar(); p.validar.mockResolvedValue({ ...aviso, transaccion: "../otro" });
    expect((await p.manejar(p.peticion())).status).toBe(400); expect(p.consultar).not.toHaveBeenCalled();
  });
  it("no usa una llave de pruebas para una operación de producción", async () => {
    const consultar = vi.fn<typeof fetch>();
    const manejar = manejadorDePagos({ validar: async () => ({ ...aviso, ambiente: "prod" }), confirmar: vi.fn(), consultar, llavePrivada: () => "prv_test_ficticia" });
    expect((await manejar(preparar().peticion())).status).toBe(503); expect(consultar).not.toHaveBeenCalled();
  });
  it("limita el cuerpo y descarta JSON inválido", async () => {
    const p = preparar();
    expect((await p.manejar(new Request("https://unigo.test", { method: "POST", body: "x".repeat(20001) }))).status).toBe(413);
    expect((await p.manejar(new Request("https://unigo.test", { method: "POST", body: "{" }))).status).toBe(400);
    expect(p.validar).not.toHaveBeenCalled();
  });
  it("no procesa métodos distintos de POST", async () => {
    const p = preparar(); expect((await p.manejar(new Request("https://unigo.test"))).status).toBe(405); expect(p.validar).not.toHaveBeenCalled();
  });
});
