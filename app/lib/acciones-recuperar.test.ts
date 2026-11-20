// Pruebas de recuperar la contraseña desde el enlace del correo: el enlace se
// usa solo al guardar la contraseña nueva, nunca antes.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ESTADO_INICIAL } from "./estado-formulario";

const dobles = vi.hoisted(() => ({ verifyOtp: vi.fn(), updateUser: vi.fn(), getUser: vi.fn(), redirect: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: dobles.redirect }));
vi.mock("./supabase/server", () => ({
  crearClienteServidor: async () => ({ auth: { verifyOtp: dobles.verifyOtp, updateUser: dobles.updateUser, getUser: dobles.getUser } }),
}));

import { recuperarConEnlace } from "./acciones-auth";

function formulario(clave: string, confirmacion = clave, tokenHash = "pkce_abcdef1234567890") {
  const datos = new FormData();
  datos.set("clave", clave);
  datos.set("confirmacion", confirmacion);
  datos.set("token_hash", tokenHash);
  return datos;
}

beforeEach(() => {
  vi.resetAllMocks();
  dobles.verifyOtp.mockResolvedValue({ error: null });
  dobles.updateUser.mockResolvedValue({ error: null });
  dobles.getUser.mockResolvedValue({ data: { user: null } });
  dobles.redirect.mockImplementation((ruta: string) => { throw new Error(`REDIRECT:${ruta}`); });
});

describe("recuperar la contraseña con el enlace", () => {
  it("con contraseñas inválidas no gasta el enlace", async () => {
    const estado = await recuperarConEnlace(ESTADO_INICIAL, formulario("Clave12345", "Otra12345"));
    expect(estado).toMatchObject({ resultado: "error" });
    expect(dobles.verifyOtp).not.toHaveBeenCalled();
  });

  it("usa el enlace, guarda la contraseña y entra", async () => {
    await expect(recuperarConEnlace(ESTADO_INICIAL, formulario("Clave12345"))).rejects.toThrow("REDIRECT:/inicio?clave=actualizada");
    expect(dobles.verifyOtp).toHaveBeenCalledWith({ type: "recovery", token_hash: "pkce_abcdef1234567890" });
    expect(dobles.updateUser).toHaveBeenCalledWith({ password: "Clave12345" });
    expect(dobles.verifyOtp.mock.invocationCallOrder[0]).toBeLessThan(dobles.updateUser.mock.invocationCallOrder[0]);
  });

  it("si el enlace de verdad ya no sirve, lo dice sin cambiar la contraseña", async () => {
    dobles.verifyOtp.mockResolvedValue({ error: { message: "Token has expired or is invalid", code: "otp_expired" } });
    const estado = await recuperarConEnlace(ESTADO_INICIAL, formulario("Clave12345"));
    expect(estado).toMatchObject({ resultado: "error" });
    expect(dobles.updateUser).not.toHaveBeenCalled();
  });

  it("si el primer intento gastó el enlace (clave igual a la vieja), el segundo guarda con la sesión de ese intento", async () => {
    dobles.verifyOtp.mockResolvedValue({ error: { message: "One-time token not found", code: "otp_expired" } });
    dobles.getUser.mockResolvedValue({ data: { user: { id: "persona" } } });
    await expect(recuperarConEnlace(ESTADO_INICIAL, formulario("Distinta123"))).rejects.toThrow("REDIRECT:/inicio?clave=actualizada");
    expect(dobles.updateUser).toHaveBeenCalledWith({ password: "Distinta123" });
  });

  it("rechaza un enlace malformado", async () => {
    await expect(recuperarConEnlace(ESTADO_INICIAL, formulario("Clave12345", "Clave12345", "<script>"))).rejects.toThrow("REDIRECT:/entrar?error=enlace");
    expect(dobles.verifyOtp).not.toHaveBeenCalled();
  });
});
