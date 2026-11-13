import { describe, expect, it } from "vitest";
import { validarInforme } from "../../scripts/validar-auditoria.mjs";

const limpio = () => ({ auditReportVersion: 2, vulnerabilities: {}, metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 } } });
describe("auditoría de dependencias", () => {
  it("acepta un informe válido sin vulnerabilidades", () => {
    expect(validarInforme(limpio()).graves).toBe(0);
  });
  it.each([null, {}, { error: { code: "EAI_AGAIN" } }, { vulnerabilities: {} }, { ...limpio(), vulnerabilities: [] }])("rechaza resultados sin auditoría completa", (valor) => {
    expect(() => validarInforme(valor)).toThrow();
  });
  it("no pierde fallas altas indicadas en el resumen", () => {
    const informe = limpio();
    informe.metadata.vulnerabilities.high = 1;
    informe.metadata.vulnerabilities.total = 1;
    expect(validarInforme(informe).graves).toBe(1);
  });
});
