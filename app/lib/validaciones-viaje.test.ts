// Pruebas de las validaciones de los formularios del viaje.
import { describe, expect, it } from "vitest";
import type { ZodTypeAny } from "zod";
import { erroresPorCampo } from "./validaciones-auth";
import {
  esquemaCalificacion,
  esquemaOferta,
  esquemaPedirViaje,
  esquemaVehiculo,
  textoDeRecogida,
} from "./validaciones-viaje";

const viajeId = "2f1c3a8e-9b7d-4c1e-8a55-0d6f3b2a9c11";

function errores(esquema: ZodTypeAny, datos: unknown) {
  const resultado = esquema.safeParse(datos);
  return resultado.success ? {} : erroresPorCampo(resultado.error);
}

describe("pedir viaje", () => {
  const valido = { origen_lat: "4.142", origen_lng: "-73.626", direccion: " Cra 33 #15-20 ", referencia: " portón azul " };

  it("acepta datos válidos y los limpia", () => {
    const r = esquemaPedirViaje.safeParse(valido);
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.origen_lat).toBeCloseTo(4.142);
    expect(r.data.direccion).toBe("Cra 33 #15-20");
    expect(textoDeRecogida(r.data)).toBe("Cra 33 #15-20 (portón azul)");
  });

  it("la referencia es opcional", () => {
    const r = esquemaPedirViaje.safeParse({ ...valido, referencia: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(textoDeRecogida(r.data)).toBe("Cra 33 #15-20");
  });

  it("sin ubicación no hay viaje (vacío no cuenta como 0)", () => {
    expect(errores(esquemaPedirViaje, { ...valido, origen_lat: "" }).origen_lat).toMatch(/ubicación/);
    expect(errores(esquemaPedirViaje, { ...valido, origen_lng: "abc" }).origen_lng).toMatch(/ubicación/);
    expect(errores(esquemaPedirViaje, { ...valido, origen_lat: "95" }).origen_lat).toMatch(/no es válida/);
  });

  it("exige dirección razonable", () => {
    expect(errores(esquemaPedirViaje, { ...valido, direccion: "ab" }).direccion).toMatch(/dónde te recogemos/);
    expect(errores(esquemaPedirViaje, { ...valido, direccion: "x".repeat(121) }).direccion).toMatch(/Máximo/);
  });
});

describe("oferta", () => {
  it("acepta un precio entero dentro de los límites", () => {
    const r = esquemaOferta.safeParse({ viaje: viajeId, precio: "6500" });
    expect(r.success && r.data.precio).toBe(6500);
  });

  it("rechaza precios fuera de límites, decimales y vacíos", () => {
    expect(errores(esquemaOferta, { viaje: viajeId, precio: "500" }).precio).toMatch(/entre \$1\.000 y \$100\.000/);
    expect(errores(esquemaOferta, { viaje: viajeId, precio: "100001" }).precio).toMatch(/entre/);
    expect(errores(esquemaOferta, { viaje: viajeId, precio: "6500.5" }).precio).toMatch(/enteros/);
    expect(errores(esquemaOferta, { viaje: viajeId, precio: "" }).precio).toMatch(/precio/);
    expect(errores(esquemaOferta, { viaje: "no-es-uuid", precio: "6500" }).viaje).toMatch(/no existe/);
  });
});

describe("calificación", () => {
  it("acepta de 1 a 5 y comentario opcional", () => {
    const r = esquemaCalificacion.safeParse({ viaje: viajeId, estrellas: "5", comentario: "  Muy amable " });
    expect(r.success && r.data.estrellas).toBe(5);
    expect(r.success && r.data.comentario).toBe("Muy amable");
    expect(esquemaCalificacion.safeParse({ viaje: viajeId, estrellas: "4", comentario: "" }).success).toBe(true);
  });

  it("rechaza estrellas fuera de rango y comentarios largos", () => {
    expect(errores(esquemaCalificacion, { viaje: viajeId, estrellas: "0" }).estrellas).toMatch(/1 a 5/);
    expect(errores(esquemaCalificacion, { viaje: viajeId, estrellas: "6" }).estrellas).toMatch(/1 a 5/);
    expect(errores(esquemaCalificacion, { viaje: viajeId, estrellas: "3", comentario: "x".repeat(301) }).comentario).toMatch(/300/);
  });
});

describe("vehículo", () => {
  const valido = { placa: " abc-123 ", marca: "Chevrolet", modelo: "Spark", color: "Gris" };

  it("normaliza la placa", () => {
    const r = esquemaVehiculo.safeParse(valido);
    expect(r.success && r.data.placa).toBe("ABC123");
    expect(esquemaVehiculo.safeParse({ ...valido, placa: "xyz45d" }).success).toBe(true);
  });

  it("rechaza placas que no son colombianas y campos vacíos", () => {
    expect(errores(esquemaVehiculo, { ...valido, placa: "AB1234" }).placa).toMatch(/ABC123/);
    expect(errores(esquemaVehiculo, { ...valido, placa: "ABCD12" }).placa).toMatch(/ABC123/);
    expect(errores(esquemaVehiculo, { ...valido, marca: " " }).marca).toMatch(/marca/);
  });
});
