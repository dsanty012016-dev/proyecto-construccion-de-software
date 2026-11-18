import { describe, expect, it } from "vitest";
import { destinoDeRecarga, enlaceParaRecargar } from "./retorno-recarga";
const id = "a532a445-1dc5-4e52-b715-134ef6719da0";
describe("retorno después de recargar", () => {
  it.each([`/estudiante/cupos/${id}`, `/estudiante/viaje?viaje=${id}`])("conserva la tarea %s", (destino) => {
    expect(destinoDeRecarga(destino)).toBe(destino);
    expect(new URL(enlaceParaRecargar(destino), "https://unigo.test").searchParams.get("volver")).toBe(destino);
  });
  it.each([null, undefined, ["/estudiante/viaje"], "https://externo.test", "//externo.test", "/admin", "/estudiante/viaje", `/estudiante/cupos/${id}/otro`, `/estudiante/cupos/${id}\n`, `/estudiante/viaje?viaje=${id}&pagar=si`, `/estudiante/cupos/${id}?url=https://externo.test`, `/estudiante/cupos/%2f%2fexterno.test`, "/estudiante\\cupos\\" + id])("descarta un destino ajeno o alterado: %s", (destino) => {
    expect(destinoDeRecarga(destino)).toBeNull();
    expect(enlaceParaRecargar(destino)).toBe("/billetera");
  });
  it("normaliza el identificador para compararlo con el viaje actual", () => {
    expect(destinoDeRecarga(`/estudiante/viaje?viaje=${id.toUpperCase()}`)).toBe(`/estudiante/viaje?viaje=${id}`);
  });
});
