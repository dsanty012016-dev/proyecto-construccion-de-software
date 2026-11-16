"use client";
import { useState } from "react";

export function CopiarReferencia({ referencia }: { referencia: string }) {
  const [mensaje, setMensaje] = useState("");
  return <div className="space-y-1">
    <button type="button" className="min-h-11 font-semibold text-secundario" onClick={async () => {
      try { await navigator.clipboard.writeText(referencia); setMensaje("Referencia copiada."); }
      catch { setMensaje("No pudimos copiarla. Puedes seleccionar la referencia y copiarla manualmente."); }
    }}>Copiar referencia</button>
    <p role="status" className="text-sm text-texto-suave">{mensaje}</p>
  </div>;
}
