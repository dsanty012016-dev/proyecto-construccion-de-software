"use client";

import { useActionState, useId } from "react";
import { cancelarViaje } from "@/app/lib/acciones-viaje";
import { ESTADO_INICIAL } from "@/app/lib/estado-formulario";
import { pesos } from "@/app/lib/formato";
import { cancelacionDeViaje } from "@/app/lib/pagos";

// Cancelar un viaje ya aceptado, diciendo antes cuánto cuesta (012):
// - Estudiante: se le cobra el 20 % y suma un strike, salvo que reporte mal
//   comportamiento o algo raro del conductor (no paga ni recibe strike).
// - Conductor: el estudiante recupera todo y el conductor suma un strike.
export function CancelarViaje({ viajeId, quien, precio }: { viajeId: string; quien: "estudiante" | "conductor"; precio: number }) {
  const [estado, accion, pendiente] = useActionState(cancelarViaje, ESTADO_INICIAL);
  const idMotivo = useId();
  const { cobro, devolucion } = cancelacionDeViaje(precio);
  const aviso =
    quien === "estudiante"
      ? `¿Cancelar? Se te cobra ${pesos(cobro)} (20 %), recuperas ${pesos(devolucion)} y sumas 1 strike.`
      : "¿Cancelar? El estudiante recupera todo su dinero y tú sumas 1 strike.";

  return (
    <div className="space-y-3">
      <form
        action={accion}
        onSubmit={(e) => {
          if (!window.confirm(aviso)) e.preventDefault();
        }}
      >
        <input type="hidden" name="viaje" value={viajeId} />
        <button type="submit" disabled={pendiente} className="min-h-12 w-full rounded-xl font-semibold text-error hover:bg-error/10 disabled:opacity-70">
          {pendiente ? "Cancelando…" : "Cancelar viaje"}
        </button>
        <p className="text-center text-xs text-texto-suave">
          {quien === "estudiante" ? `Cuesta ${pesos(cobro)} y 1 strike.` : "Suma 1 strike a tu cuenta."}
        </p>
      </form>

      {quien === "estudiante" && (
        <details className="rounded-2xl border border-texto-suave/25 p-4">
          <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold">¿El conductor se comportó mal o pasó algo raro?</summary>
          <form action={accion} className="mt-3 space-y-2">
            <input type="hidden" name="viaje" value={viajeId} />
            <label htmlFor={idMotivo} className="block text-sm text-texto-suave">
              Cuéntanos qué pasó. Cancelas sin costo ni strike y un administrador revisa el reporte.
            </label>
            <textarea
              id={idMotivo}
              name="justificacion"
              required
              minLength={3}
              maxLength={300}
              rows={3}
              className="w-full resize-none rounded-xl border border-superficie bg-superficie p-3 text-sm text-texto outline-none focus:border-secundario"
            />
            <button type="submit" disabled={pendiente} className="min-h-11 w-full rounded-xl border border-error/50 text-sm font-semibold text-error hover:bg-error/10 disabled:opacity-70">
              Cancelar y reportar
            </button>
          </form>
        </details>
      )}

      {estado.resultado === "error" && estado.mensaje && (
        <p role="alert" className="text-center text-sm text-error">
          {estado.mensaje}
        </p>
      )}
    </div>
  );
}
