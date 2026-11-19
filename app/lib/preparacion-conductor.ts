import { TIPOS_DOCUMENTO, type TipoDocumento } from "./documentos";

export const DIAS_REVISION_DOCUMENTOS = 7;
type Documento = { estado: "pendiente" | "aprobado" | "rechazado"; enviado_en: string; vence_el?: string | null };
export type DocumentosPreparacion = Partial<Record<TipoDocumento, Documento>>;

export function revisionDocumento(documento: Documento, ahora: number) {
  const enviado = Date.parse(documento.enviado_en);
  const limite = Number.isFinite(enviado) ? enviado + DIAS_REVISION_DOCUMENTOS * 86_400_000 : null;
  return { limite, vencido: documento.estado === "pendiente" && limite !== null && ahora > limite };
}

const FECHA_BOGOTA = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" });

export function diasParaVencerLicencia(venceEl: string | null | undefined, ahora: number): number | null {
  return venceEl ? (Date.parse(venceEl) - Date.parse(FECHA_BOGOTA.format(ahora))) / 86_400_000 : null;
}

export function preparacionConductor(tieneVehiculo: boolean, documentos: DocumentosPreparacion, disponible: boolean, ahora?: number) {
  const enviados = TIPOS_DOCUMENTO.filter(t => documentos[t]).length;
  const licenciaVencida = ahora !== undefined && (diasParaVencerLicencia(documentos.licencia?.vence_el, ahora) ?? 0) < 0;
  const aprobados = TIPOS_DOCUMENTO.filter(t => documentos[t]?.estado === "aprobado" && !(t === "licencia" && licenciaVencida)).length;
  const rechazados = TIPOS_DOCUMENTO.filter(t => documentos[t]?.estado === "rechazado" || (t === "licencia" && licenciaVencida)).length;
  const verificado = aprobados === TIPOS_DOCUMENTO.length;
  const paso = !tieneVehiculo ? "vehiculo" : rechazados > 0 || enviados < TIPOS_DOCUMENTO.length ? "documentos" : !verificado ? "revision" : !disponible ? "disponibilidad" : "listo";
  return { enviados, aprobados, rechazados, verificado, paso, licenciaVencida };
}
