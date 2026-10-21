// Documentos del conductor: tipos, nombres y reglas de los archivos, como
// funciones puras (con prueba). La base guarda y revisa (011); el archivo va
// al bucket privado "documentos" en la carpeta del conductor.

export const TIPOS_DOCUMENTO = ["cedula", "licencia", "tarjeta_propiedad"] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;
export const TIPOS_ARCHIVO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export function nombreDocumento(tipo: TipoDocumento): string {
  const nombres = { cedula: "Cédula", licencia: "Licencia de conducción", tarjeta_propiedad: "Tarjeta de propiedad" };
  return nombres[tipo];
}

export function ayudaDocumento(tipo: TipoDocumento): string {
  const ayudas = {
    cedula: "Foto clara de los dos lados (puede ser un PDF).",
    licencia: "Que se vea la categoría y la fecha de vencimiento.",
    tarjeta_propiedad: "Del vehículo que registraste: la placa debe coincidir.",
  };
  return ayudas[tipo];
}

/** Revisa el archivo antes de subirlo. Devuelve el mensaje de error o null. */
export function problemaConArchivo(archivo: { type: string; size: number }): string | null {
  if (!(archivo.type in TIPOS_ARCHIVO)) return "Sube una foto (JPG, PNG o WEBP) o un PDF.";
  if (archivo.size === 0) return "Ese archivo está vacío.";
  if (archivo.size > TAMANO_MAXIMO_BYTES) return "El archivo pesa más de 5 MB.";
  return null;
}

/** Ruta dentro del bucket: <id del conductor>/<tipo>-<marca de tiempo>.<extensión>. */
export function rutaDocumento(conductorId: string, tipo: TipoDocumento, tipoArchivo: string, marcaMs: number): string {
  return `${conductorId}/${tipo}-${marcaMs}.${TIPOS_ARCHIVO[tipoArchivo] ?? "bin"}`;
}

/** La misma forma que exige la base (011): carpeta = id del conductor. */
export function rutaValida(ruta: string, conductorId: string): boolean {
  return /^[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,100}$/.test(ruta) && ruta.split("/")[0] === conductorId;
}

export function verificado(estados: Partial<Record<TipoDocumento, string>>): boolean {
  return TIPOS_DOCUMENTO.every((tipo) => estados[tipo] === "aprobado");
}
