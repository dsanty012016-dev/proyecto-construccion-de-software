import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Una auditoría que no pudo consultar el registro debe fallar también en CI.
export function validarInforme(informe) {
  const resumen = informe?.metadata?.vulnerabilities;
  if (!informe || informe.error || informe.auditReportVersion !== 2
      || !informe.vulnerabilities || Array.isArray(informe.vulnerabilities)
      || typeof informe.vulnerabilities !== "object" || !resumen
      || !["info", "low", "moderate", "high", "critical", "total"].every((nivel) => Number.isInteger(resumen[nivel]) && resumen[nivel] >= 0)) {
    throw new Error("La auditoría no devolvió un informe válido. Revisa la conexión con el registro de paquetes.");
  }
  const vulnerabilidades = Object.values(informe.vulnerabilities);
  if (vulnerabilidades.some((v) => !v || typeof v !== "object" || typeof v.name !== "string" || !Array.isArray(v.via))) {
    throw new Error("La auditoría devolvió datos incompletos.");
  }
  const graves = vulnerabilidades.filter((v) => v.severity === "high" || v.severity === "critical");
  return { vulnerabilidades, graves: Math.max(graves.length, resumen.high + resumen.critical) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { vulnerabilidades, graves } = validarInforme(JSON.parse(readFileSync(process.argv[2], "utf8")));
    for (const v of vulnerabilidades) console.log(`::warning::${v.severity} · ${v.name} · ${v.range}`);
    if (graves > 0) throw new Error(`${graves} dependencias con fallas altas o críticas.`);
    console.log("Auditoría completada: sin fallas altas o críticas.");
  } catch (error) {
    console.error(`::error::${error instanceof Error ? error.message : "No se pudo completar la auditoría."}`);
    process.exitCode = 1;
  }
}
