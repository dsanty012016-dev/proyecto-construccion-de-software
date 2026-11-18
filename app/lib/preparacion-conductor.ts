import { TIPOS_DOCUMENTO, type TipoDocumento } from "./documentos";

export const DIAS_REVISION_DOCUMENTOS = 7;
type Documento = { estado: "pendiente" | "aprobado" | "rechazado"; enviado_en: string };
export type DocumentosPreparacion = Partial<Record<TipoDocumento, Documento>>;

export function revisionDocumento(documento: Documento, ahora: number) {
  const enviado = Date.parse(documento.enviado_en);
  const limite = Number.isFinite(enviado) ? enviado + DIAS_REVISION_DOCUMENTOS * 86_400_000 : null;
  return { limite, vencido: documento.estado === "pendiente" && limite !== null && ahora > limite };
}

export function preparacionConductor(tieneVehiculo: boolean, documentos: DocumentosPreparacion, disponible: boolean) {
  const enviados = TIPOS_DOCUMENTO.filter(t => documentos[t]).length;
  const aprobados = TIPOS_DOCUMENTO.filter(t => documentos[t]?.estado === "aprobado").length;
  const rechazados = TIPOS_DOCUMENTO.filter(t => documentos[t]?.estado === "rechazado").length;
  const verificado = aprobados === TIPOS_DOCUMENTO.length;
  const paso = !tieneVehiculo ? "vehiculo" : rechazados > 0 || enviados < TIPOS_DOCUMENTO.length ? "documentos" : !verificado ? "revision" : !disponible ? "disponibilidad" : "listo";
  return { enviados, aprobados, rechazados, verificado, paso };
}
