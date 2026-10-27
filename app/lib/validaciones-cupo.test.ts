// Pruebas de las validaciones de los formularios de cupos.
import { describe, expect, it } from "vitest";
import type { ZodType } from "zod";
import { erroresPorCampo } from "./validaciones-auth";
import { esquemaPedirPuesto, esquemaPublicarCupo, esquemaResponderPuesto } from "./validaciones-cupo";

function errores(esquema: ZodType, datos: unknown) {
  const resultado = esquema.safeParse(datos);
  return resultado.success ? {} : erroresPorCampo(resultado.error);
}

const cupoId = "2f1c3a8e-9b7d-4c1e-8a55-0d6f3b2a9c11";

describe("publicar cupo", () => {
  const valido = { sentido: "ida", punto_lat: "4.15", punto_lng: "-73.64", direccion: " Barzal ", sale_en: "2026-10-22T06:30", puestos: "3", precio: "6000" };

  it("acepta datos válidos y pasa la hora a ISO", () => {
    const r = esquemaPublicarCupo.safeParse(valido);
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.sale_en).toBe("2026-10-22T11:30:00.000Z");
    expect(r.data.direccion).toBe("Barzal");
    expect(r.data.puestos).toBe(3);
  });

  it("exige punto, hora, puestos y precio válidos", () => {
    expect(errores(esquemaPublicarCupo, { ...valido, punto_lat: "" }).punto_lat).toMatch(/en el mapa/);
    expect(errores(esquemaPublicarCupo, { ...valido, sentido: "" }).sentido).toMatch(/Elige si vas/);
    expect(esquemaPublicarCupo.safeParse({ ...valido, sentido: "regreso", u_lat: "4.1217", u_lng: "-73.6155" }).success).toBe(true);
    expect(errores(esquemaPublicarCupo, { ...valido, sale_en: "mañana" }).sale_en).toMatch(/fecha y la hora/);
    expect(errores(esquemaPublicarCupo, { ...valido, puestos: "5" }).puestos).toMatch(/de 1 a 4/);
    expect(errores(esquemaPublicarCupo, { ...valido, puestos: "0" }).puestos).toMatch(/de 1 a 4/);
    expect(errores(esquemaPublicarCupo, { ...valido, precio: "800" }).precio).toMatch(/entre \$1\.000/);
  });
});

describe("pedir puesto", () => {
  const valido = { cupo: cupoId, recogida_lat: "4.14", recogida_lng: "-73.63", direccion: "Cra 30 #10", referencia: "" };

  it("acepta datos válidos", () => {
    const r = esquemaPedirPuesto.safeParse(valido);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.referencia).toBeUndefined();
  });

  it("exige el punto del mapa y un cupo válido", () => {
    expect(errores(esquemaPedirPuesto, { ...valido, recogida_lng: "" }).recogida_lng).toMatch(/en el mapa/);
    expect(errores(esquemaPedirPuesto, { ...valido, cupo: "x" }).cupo).toMatch(/no existe/);
  });
});

describe("responder puesto", () => {
  it("solo aprobar o rechazar", () => {
    expect(esquemaResponderPuesto.safeParse({ puesto: cupoId, decision: "aprobar" }).success).toBe(true);
    expect(esquemaResponderPuesto.safeParse({ puesto: cupoId, decision: "quizas" }).success).toBe(false);
  });
});
