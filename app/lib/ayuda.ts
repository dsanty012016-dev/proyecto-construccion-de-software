export type MotivoDeAyuda =
  | { tipo: "general" }
  | { tipo: "viaje" | "cupo" | "falta"; referencia: string };

/** Prepara un borrador de WhatsApp con la referencia para ubicar el caso. */
export function enlaceDeAyuda(numero: string | undefined, motivo: MotivoDeAyuda): string | null {
  const destino = numero?.trim().replace(/^\+/, "").replace(/[ ()-]/g, "");
  if (!destino || !/^[1-9]\d{7,14}$/.test(destino)) return null;

  const saludo = "Hola, equipo UniGo.";
  switch (motivo.tipo) {
    case "general":
      return enlace(destino, `${saludo} Necesito ayuda con mi cuenta.`);
    case "falta":
      return enlace(destino, `${saludo} Quisiera solicitar la revisión de una falta. Referencia: ${motivo.referencia}.`);
    default:
      return enlace(destino, `${saludo} Necesito ayuda con mi ${motivo.tipo}. Referencia: ${motivo.referencia}.`);
  }
}

function enlace(numero: string, texto: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}
