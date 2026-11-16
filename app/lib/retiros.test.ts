import { describe, expect, it } from "vitest";
import { esquemaRetiro, esquemaRevisionRetiro, paginaValida } from "./retiros";
describe("retiros a Nequi", () => {
  it("normaliza un número colombiano y admite el mínimo", () => expect(esquemaRetiro.parse({ monto: "20000", nequi: "+57 300 111 2233" })).toEqual({ monto: 20000, nequi: "3001112233" }));
  it.each(["19999", "-20000", "2e4", "20000.5", "1000001"])("no permite el monto %s", (monto) => expect(esquemaRetiro.safeParse({ monto, nequi: "3001112233" }).success).toBe(false));
  it("no registra un pago sin la revisión de documentos y comprobante", () => expect(esquemaRevisionRetiro.safeParse({ retiro: "a532a445-1dc5-4e52-b715-134ef6719da0", resultado: "pagado" }).success).toBe(false));
  it("exige un motivo cuando se rechaza", () => expect(esquemaRevisionRetiro.safeParse({ retiro: "a532a445-1dc5-4e52-b715-134ef6719da0", resultado: "rechazado", motivo: "" }).success).toBe(false));
  it("acepta un pago revisado con referencia", () => expect(esquemaRevisionRetiro.safeParse({ retiro: "a532a445-1dc5-4e52-b715-134ef6719da0", resultado: "pagado", documentos: "on", referencia: "NEQUI-12345" }).success).toBe(true));
  it("mantiene la paginación en un entero seguro", () => { expect(paginaValida("1e10")).toBe(1); expect(paginaValida("-1")).toBe(1); expect(paginaValida("0")).toBe(1); expect(paginaValida("3")).toBe(3); });
});
