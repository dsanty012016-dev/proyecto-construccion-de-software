// Solo se vuelve a una tarea de estudiante conocida. El destino no autoriza
// pagos: cada pantalla vuelve a consultar estado, saldo y plazo con RLS.
const ID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const CUPO = new RegExp(`^/estudiante/cupos/${ID}$`, "i");
const VIAJE = new RegExp(`^/estudiante/viaje\\?viaje=${ID}$`, "i");

export function destinoDeRecarga(valor: unknown): string | null {
  return typeof valor === "string" && !/[\s\\]/.test(valor) && (CUPO.test(valor) || VIAJE.test(valor)) ? valor.toLowerCase() : null;
}

export function enlaceParaRecargar(destino: unknown): string {
  const seguro = destinoDeRecarga(destino);
  return seguro ? `/billetera?volver=${encodeURIComponent(seguro)}` : "/billetera";
}

export function textoDeRetorno(destino: string): string {
  return destino.startsWith("/estudiante/cupos/") ? "Volver a mi cupo" : "Volver a mi viaje";
}
