import { describe, expect, it } from "vitest";
import { ENLACE_LLAMADA_EMERGENCIA, emergenciaDisponible, enlaceMapaEmergencia } from "./emergencia";

describe("botón de emergencia", () => {
  it("llama a la línea única de emergencias de Colombia", () => {
    expect(ENLACE_LLAMADA_EMERGENCIA).toBe("tel:123");
  });
  it("aparece en un viaje con conductor", () => {
    expect(emergenciaDisponible({ tipo: "viaje", estado: "aceptado" })).toBe(true);
    expect(emergenciaDisponible({ tipo: "viaje", estado: "en_curso" })).toBe(true);
  });
  it("no aparece en un viaje sin conductor o cerrado", () => {
    for (const estado of ["solicitado", "terminado", "cancelado"]) expect(emergenciaDisponible({ tipo: "viaje", estado })).toBe(false);
  });
  it("en un cupo activo lo ve el conductor y quien pagó", () => {
    expect(emergenciaDisponible({ tipo: "cupo", estado: "publicado", soyConductor: true, pagado: false })).toBe(true);
    expect(emergenciaDisponible({ tipo: "cupo", estado: "en_curso", soyConductor: false, pagado: true })).toBe(true);
  });
  it("quien no ha pagado su puesto no lo ve", () => {
    expect(emergenciaDisponible({ tipo: "cupo", estado: "en_curso", soyConductor: false, pagado: false })).toBe(false);
  });
  it("en un cupo cerrado no aparece", () => {
    expect(emergenciaDisponible({ tipo: "cupo", estado: "terminado", soyConductor: true, pagado: true })).toBe(false);
  });
  it("el enlace del mapa lleva las coordenadas", () => {
    expect(enlaceMapaEmergencia(4.1216861, -73.615496)).toBe("https://www.google.com/maps/search/?api=1&query=4.121686,-73.615496");
  });
});
