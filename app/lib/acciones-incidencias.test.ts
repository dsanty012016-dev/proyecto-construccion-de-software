import { beforeEach, describe, expect, it, vi } from "vitest";
import { cerrarIncidencia } from "./acciones-incidencias";
import { ESTADO_INICIAL } from "./estado-formulario";

const dobles = vi.hoisted(() => ({ rpc: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: dobles.revalidatePath }));
vi.mock("./supabase/server", () => ({ crearClienteServidor: async () => ({ rpc: dobles.rpc }) }));

const id = "a532a445-1dc5-4e52-b715-134ef6719da0";
function datos(confirmada: boolean) {
  const form = new FormData();
  form.set("incidencia", id);
  form.set("nota", "  Comparación documentada.  ");
  form.set("resultado", "sin_ajuste");
  if (confirmada) form.set("verificada", "on");
  return form;
}

beforeEach(() => {
  vi.resetAllMocks();
  dobles.rpc.mockResolvedValue({ error: null });
});

describe("cerrar una incidencia", () => {
  it("exige la confirmación y un resultado antes de guardar", async () => {
    const form = datos(false);
    form.set("nota", " ");
    const estado = await cerrarIncidencia(ESTADO_INICIAL, form);
    expect(estado.errores).toHaveProperty("verificada");
    expect(estado.errores).toHaveProperty("nota");
    expect(dobles.rpc).not.toHaveBeenCalled();
  });

  it("envía únicamente lo necesario para guardar el cierre administrativo", async () => {
    await expect(cerrarIncidencia(ESTADO_INICIAL, datos(true))).resolves.toMatchObject({ resultado: "listo" });
    expect(dobles.rpc).toHaveBeenCalledOnce();
    expect(dobles.rpc).toHaveBeenCalledWith("resolver_incidencia_pago", {
      p_incidencia: id, p_verificada: true, p_nota: "Comparación documentada.", p_resultado: "sin_ajuste",
    });
    expect(dobles.revalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("muestra el rechazo de un cierre simultáneo sin anunciar éxito", async () => {
    dobles.rpc.mockResolvedValue({ error: { code: "P0001", message: "La incidencia ya fue cerrada." } });
    const estado = await cerrarIncidencia(ESTADO_INICIAL, datos(true));
    expect(estado).toMatchObject({ resultado: "error", mensaje: "La incidencia ya fue cerrada." });
    expect(dobles.revalidatePath).not.toHaveBeenCalled();
  });
});
