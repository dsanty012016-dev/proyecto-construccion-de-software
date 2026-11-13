import { describe, expect, it, vi } from "vitest";
import { enviarEntregas, type Entrega } from "../../supabase/functions/enviar-avisos/entregas";

const entrega = (id: string): Entrega => ({ titulo: "Viaje", cuerpo: "Cambió", url: "/inicio", endpoint: `https://push.example.com/${id}`, p256dh: "p", auth: "a", suscripcion_id: id, token_toma: "reserva" });
describe("entregas de notificaciones", () => {
  it("confirma el celular correcto solo después del envío", async () => {
    const eventos: string[] = [];
    const r = await enviarEntregas([entrega("uno")], async () => { eventos.push("enviar"); }, async (_d, ok) => { eventos.push(`confirmar:${ok}`); });
    expect(eventos).toEqual(["enviar", "confirmar:true"]);
    expect(r).toEqual({ enviados: 1, vencidas: [], fallidos: 0 });
  });
  it("conserva el éxito parcial y deja reintentar al destinatario que falló", async () => {
    const confirmar = vi.fn(async () => undefined);
    const r = await enviarEntregas([entrega("uno"), entrega("dos")], async (d) => {
      if (d.suscripcion_id === "dos") throw { statusCode: 503 };
    }, confirmar);
    expect(r).toEqual({ enviados: 1, vencidas: [], fallidos: 1 });
    expect(confirmar).toHaveBeenCalledWith(entrega("uno"), true);
    expect(confirmar).toHaveBeenCalledWith(entrega("dos"), false);
  });
  it.each([404, 410])("retira los celulares vencidos por %i sin reintentarlos", async (statusCode) => {
    const confirmar = vi.fn(async () => undefined);
    const d = entrega("vencido");
    expect(await enviarEntregas([d], async () => { throw { statusCode }; }, confirmar)).toEqual({ enviados: 0, vencidas: [d.endpoint], fallidos: 0 });
    expect(confirmar).toHaveBeenCalledWith(d, true);
  });
  it("no anuncia éxito si falla la confirmación en la base", async () => {
    const r = await enviarEntregas([entrega("uno")], async () => undefined, async () => { throw new Error("sin base"); });
    expect(r).toEqual({ enviados: 0, vencidas: [], fallidos: 1 });
  });
  it("un error de red deja la entrega pendiente", async () => {
    const confirmar = vi.fn(async () => undefined);
    expect((await enviarEntregas([entrega("uno")], async () => { throw new Error("sin red"); }, confirmar)).fallidos).toBe(1);
    expect(confirmar).toHaveBeenCalledWith(entrega("uno"), false);
  });
});
