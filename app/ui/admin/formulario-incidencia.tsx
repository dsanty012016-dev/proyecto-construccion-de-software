"use client";

import { startTransition, useActionState, useId, useState } from "react";
import { cerrarIncidencia } from "@/app/lib/acciones-incidencias";
import { ESTADO_INICIAL } from "@/app/lib/estado-formulario";
import { Aviso, Campo, ResumenErrores } from "@/app/ui/auth/campos";

export function FormularioIncidencia({ idIncidencia }: { idIncidencia: string }) {
  const [estado, accion, pendiente] = useActionState(cerrarIncidencia, ESTADO_INICIAL);
  const [resultado, seleccionarResultado] = useState("");
  const id = useId();
  if (estado.resultado === "listo") return <Aviso tipo="listo">{estado.mensaje}</Aviso>;
  return (
    <details className="rounded-xl border border-texto-suave/30 px-3">
      <summary className="min-h-11 cursor-pointer py-3 font-semibold text-secundario">Registrar revisión</summary>
      <form className="space-y-3 border-t border-texto-suave/20 py-3" aria-busy={pendiente}
        onSubmit={(evento) => {
          evento.preventDefault();
          if (pendiente) return;
          const datos = new FormData(evento.currentTarget);
          startTransition(() => accion(datos));
        }}>
        <input type="hidden" name="incidencia" value={idIncidencia} />
        <ResumenErrores estado={estado} />
        <label className="flex min-h-11 items-start gap-3">
          <input type="checkbox" name="verificada" className="mt-1 size-5 shrink-0 accent-primario"
            aria-invalid={!!estado.errores?.verificada || undefined}
            aria-describedby={estado.errores?.verificada ? `${id}-error-verificada` : undefined} required />
          <span>Comparé la referencia, transacción, monto y estado en Wompi con la recarga y los movimientos de UniGo.</span>
        </label>
        {estado.errores?.verificada && <p id={`${id}-error-verificada`} className="text-error">{estado.errores.verificada}</p>}
        <label htmlFor={`${id}-resultado`} className="block font-semibold">Resultado de la conciliación</label>
        <select id={`${id}-resultado`} name="resultado" value={resultado} onChange={(e) => seleccionarResultado(e.target.value)}
          required className="min-h-12 w-full rounded-xl border border-texto-suave/60 bg-superficie px-3">
          <option value="">Elige un resultado</option>
          <option value="sin_ajuste">Revisión completada sin ajuste</option>
          <option value="devolucion_externa">Se realizó una devolución por fuera de UniGo</option>
        </select>
        {resultado === "devolucion_externa" && <>
          <Campo etiqueta="Monto devuelto en pesos" name="monto" inputMode="numeric" error={estado.errores?.monto} required />
          <Campo etiqueta="Referencia del comprobante" name="comprobante" maxLength={100} error={estado.errores?.comprobante} required />
        </>}
        <label htmlFor={`${id}-nota`} className="block font-semibold">Nota interna</label>
        <textarea id={`${id}-nota`} name="nota" required minLength={3} maxLength={500} rows={3}
          aria-invalid={!!estado.errores?.nota || undefined}
          aria-describedby={estado.errores?.nota ? `${id}-error-nota` : undefined}
          className="w-full rounded-xl border border-texto-suave/60 bg-superficie p-3" />
        {estado.errores?.nota && <p id={`${id}-error-nota`} className="text-error">{estado.errores.nota}</p>}
        <p className="text-texto-suave">Si faltaba una referencia o un movimiento, déjalo registrado aquí. Guardar el cierre solo registra tu revisión.</p>
        <button type="submit" disabled={pendiente} className="prensa min-h-12 w-full rounded-xl bg-primario px-4 py-3 font-semibold text-sobre-primario disabled:opacity-60">
          {pendiente ? "Guardando…" : "Cerrar revisión"}
        </button>
      </form>
    </details>
  );
}
