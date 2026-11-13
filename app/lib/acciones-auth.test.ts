import { beforeEach, describe, expect, it, vi } from "vitest";
import { ESTADO_INICIAL } from "./estado-formulario";

const dobles = vi.hoisted(() => ({ rpc: vi.fn(), signOut: vi.fn(), redirect: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: dobles.redirect }));
vi.mock("./supabase/server", () => ({
  crearClienteServidor: async () => ({ rpc: dobles.rpc, auth: { signOut: dobles.signOut } }),
}));

import { salir } from "./acciones-auth";

const endpoint = "https://push.example.com/este-celular";
function formulario() {
  const datos = new FormData();
  datos.set("endpoint", endpoint);
  return datos;
}

beforeEach(() => {
  vi.resetAllMocks();
  dobles.rpc.mockResolvedValue({ error: null });
  dobles.signOut.mockResolvedValue({ error: null });
  dobles.redirect.mockImplementation(() => { throw new Error("REDIRECT:/entrar"); });
});

describe("cerrar sesión y notificaciones", () => {
  it("quita solo la suscripción enviada mientras la sesión sigue disponible", async () => {
    const suscripciones = new Map([[endpoint, "cuenta-a"], ["https://push.example.com/otro-celular", "cuenta-a"]]);
    dobles.rpc.mockImplementation(async (_nombre, datos) => {
      suscripciones.delete(datos.p_endpoint);
      return { error: null };
    });
    await expect(salir(ESTADO_INICIAL, formulario())).rejects.toThrow("REDIRECT:/entrar");
    expect(dobles.rpc).toHaveBeenCalledWith("borrar_suscripcion", { p_endpoint: endpoint });
    expect(dobles.rpc.mock.invocationCallOrder[0]).toBeLessThan(dobles.signOut.mock.invocationCallOrder[0]);
    expect(suscripciones.has(endpoint)).toBe(false);
    expect(suscripciones.has("https://push.example.com/otro-celular")).toBe(true);
    expect(dobles.redirect).toHaveBeenCalledWith("/entrar");
  });

  it("permite salir de un navegador que no tiene suscripción", async () => {
    await expect(salir(ESTADO_INICIAL, new FormData())).rejects.toThrow("REDIRECT:/entrar");
    expect(dobles.rpc).not.toHaveBeenCalled();
    expect(dobles.signOut).toHaveBeenCalledOnce();
  });

  it("conserva la sesión y ofrece reintentar si no pudo desvincular el celular", async () => {
    dobles.rpc.mockResolvedValue({ error: { message: "sin conexión" } });
    expect(await salir(ESTADO_INICIAL, formulario())).toMatchObject({ resultado: "error" });
    expect(dobles.signOut).not.toHaveBeenCalled();
    expect(dobles.redirect).not.toHaveBeenCalled();
  });

  it.each(["http://push.example.com/inseguro", "https://" + "x".repeat(1000), new Blob(["archivo"])])("rechaza endpoints inválidos antes de tocar datos", async (valor) => {
    const datos = new FormData();
    datos.set("endpoint", valor);
    expect(await salir(ESTADO_INICIAL, datos)).toMatchObject({ resultado: "error" });
    expect(dobles.rpc).not.toHaveBeenCalled();
    expect(dobles.signOut).not.toHaveBeenCalled();
  });

  it("no anuncia un cierre correcto si Supabase devuelve un error", async () => {
    dobles.signOut.mockResolvedValue({ error: { message: "sin conexión" } });
    expect(await salir(ESTADO_INICIAL, formulario())).toMatchObject({ resultado: "error" });
    expect(dobles.redirect).not.toHaveBeenCalled();
  });
});
