/** La espera de interfaz complementa los límites del proveedor, sin autorizar envíos. */
export function segundosParaReenviar(limite: number | undefined, ahora: number): number {
  if (!limite || !Number.isFinite(limite) || !Number.isFinite(ahora)) return 0;
  return Math.min(60, Math.max(0, Math.ceil((limite - ahora) / 1000)));
}
