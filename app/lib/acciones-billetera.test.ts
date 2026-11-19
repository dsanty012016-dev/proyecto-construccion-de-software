import { beforeEach, describe, expect, it, vi } from "vitest";
const dobles = vi.hoisted(() => ({ modo: "prueba", configurada: true, rpc: vi.fn(), destinos: [] as string[] }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { dobles.destinos.push(url); throw new Error("REDIRECCION_LOCAL"); } }));
vi.mock("./supabase/server", () => ({ crearClienteServidor: async () => ({ rpc: dobles.rpc }) }));
vi.mock("./pasarela", () => ({
  modoDeRecarga: () => dobles.modo,
  origenDelSitio: async () => "https://unigo.test",
  pasarela: () => dobles.configurada ? { ambiente: "pruebas", llavePublica: "pub_test_ficticia", secretoIntegridad: "test_integrity_ficticio" } : null,
}));
import { iniciarRecarga, recargar } from "./acciones-billetera";
import { ESTADO_INICIAL } from "./estado-formulario";
const id = "a532a445-1dc5-4e52-b715-134ef6719da0";
const destino = `/estudiante/cupos/${id}`;
const inicial = ESTADO_INICIAL;
function formulario(volver = destino, monto = "20000") {
  const f = new FormData(); f.set("monto", monto); f.set("volver", volver); return f;
}
beforeEach(() => {
  dobles.modo = "prueba";dobles.configurada = true;dobles.destinos = [];
  dobles.rpc.mockReset().mockResolvedValue({ data: id, error: null });
});
describe("recargas e intención de retorno", () => {
  it.each(["wompi", "wompi-pruebas", "no-disponible"])("una llamada directa no suma saldo simulado en %s", async (modo) => {
    dobles.modo = modo;
    expect(await recargar(inicial, formulario())).toMatchObject({ resultado: "error" });
    expect(dobles.rpc).not.toHaveBeenCalled();
  });
  it("la simulación explícita vuelve a la tarea y solo recarga", async () => {
    await expect(recargar(inicial, formulario())).rejects.toThrow("REDIRECCION_LOCAL");
    expect(dobles.destinos).toEqual([destino]);
    expect(dobles.rpc.mock.calls).toEqual([["recargar", { p_monto: 20000 }]]);
  });
  it("la simulación no redirige a otro dominio", async () => {
    expect(await recargar(inicial, formulario("//externo.test"))).toMatchObject({ resultado: "listo" });
    expect(dobles.destinos).toEqual([]);
  });
  it("una configuración incompleta no abre una recarga", async () => {
    dobles.configurada = false;
    expect(await iniciarRecarga(inicial, formulario())).toMatchObject({ resultado: "error" });
    expect(dobles.rpc).not.toHaveBeenCalled();
  });
  it("Wompi conserva el retorno dentro de la URL de confirmación", async () => {
    await expect(iniciarRecarga(inicial, formulario())).rejects.toThrow("REDIRECCION_LOCAL");
    const checkout = new URL(dobles.destinos[0]);
    const regreso = new URL(checkout.searchParams.get("redirect-url")!);
    expect(checkout.origin).toBe("https://checkout.wompi.co");
    expect(regreso.origin).toBe("https://unigo.test");
    expect(regreso.pathname).toBe(`/billetera/recarga/${id}`);
    expect(regreso.searchParams.get("volver")).toBe(destino);
    expect(dobles.rpc.mock.calls).toEqual([["iniciar_recarga_wompi", { p_monto: 20000, p_ambiente: "test" }]]);
  });
  it("un retorno manipulado no se incorpora a Wompi", async () => {
    await expect(iniciarRecarga(inicial, formulario("https://externo.test"))).rejects.toThrow("REDIRECCION_LOCAL");
    expect(new URL(new URL(dobles.destinos[0]).searchParams.get("redirect-url")!).searchParams.has("volver")).toBe(false);
  });
  it("fallar al abrir la recarga conserva el monto y el destino", async () => {
    dobles.rpc.mockResolvedValue({ data: null, error: { code: "ERROR" } });
    expect(await iniciarRecarga(inicial, formulario())).toMatchObject({ resultado: "error", valores: { monto: "20000", volver: destino } });
    expect(dobles.destinos).toEqual([]);
  });
  it("no entrega checkout cuando la base bloquea ese ambiente", async () => {
    dobles.rpc.mockResolvedValue({ data: null, error: { code: "P0001", message: "Recargas pausadas." } });
    expect(await iniciarRecarga(inicial, formulario())).toMatchObject({ resultado: "error", mensaje: "Recargas pausadas." });
    expect(dobles.destinos).toEqual([]);
  });
  it("un monto inválido no llega a la base", async () => {
    expect(await iniciarRecarga(inicial, formulario(destino, "1"))).toMatchObject({ resultado: "error", errores: { monto: expect.any(String) } });
    expect(dobles.rpc).not.toHaveBeenCalled();
  });
});
