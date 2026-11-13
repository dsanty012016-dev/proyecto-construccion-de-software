import { describe, expect, it } from "vitest";
import { puestoSinPagoVencido } from "./pagos";

describe("puesto sin pago vencido", () => {
  const salida = 2_000_000;
  it("libera al estudiante después del límite, incluso antes de que corra la tarea", () => {
    expect(puestoSinPagoVencido({ estado: "aprobado", pagado: 0 }, salida, salida - 599_999)).toBe(true);
    expect(puestoSinPagoVencido({ estado: "aprobado", pagado: 0 }, salida, salida - 600_000)).toBe(false);
  });
  it("conserva los puestos pagados y las solicitudes pendientes", () => {
    expect(puestoSinPagoVencido({ estado: "aprobado", pagado: 7000 }, salida, salida)).toBe(false);
    expect(puestoSinPagoVencido({ estado: "pendiente", pagado: 0 }, salida, salida)).toBe(false);
  });
});
