"use client";

import { useActionState, useId } from "react";
import { revisarDocumento } from "@/app/lib/acciones-verificacion";
import { ESTADO_INICIAL } from "@/app/lib/estado-formulario";

// Aprobar o rechazar un documento. Rechazar exige un motivo, que el conductor
// verá. La regla (solo administradores, nunca los propios) está en la base.
export function FormularioRevisar({ documentoId }: { documentoId: string }) {
  const [estado, accion, pendiente] = useActionState(revisarDocumento, ESTADO_INICIAL);
  const idMotivo = useId();
  return (
    <form action={accion} className="space-y-2">
      <input type="hidden" name="documento" value={documentoId} />
      <label htmlFor={idMotivo} className="block text-sm font-medium">
        Motivo si lo rechazas
      </label>
      <input
        id={idMotivo}
        name="motivo"
        maxLength={300}
        placeholder="Ej.: la foto está borrosa"
        className="h-11 w-full rounded-xl border border-superficie bg-fondo px-3 text-sm text-texto outline-none placeholder:text-texto-suave/70 focus:border-secundario"
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="submit"
          name="decision"
          value="rechazar"
          disabled={pendiente}
          className="min-h-11 rounded-xl border border-texto-suave/30 text-sm font-semibold text-error hover:bg-error/10 disabled:opacity-70"
        >
          Rechazar
        </button>
        <button
          type="submit"
          name="decision"
          value="aprobar"
          disabled={pendiente}
          className="min-h-11 rounded-xl bg-primario text-sm font-semibold text-texto hover:bg-primario/85 disabled:opacity-70"
        >
          Aprobar
        </button>
      </div>
      {estado.resultado === "error" && estado.mensaje && (
        <p role="alert" className="text-sm text-error">
          {estado.mensaje}
        </p>
      )}
    </form>
  );
}
