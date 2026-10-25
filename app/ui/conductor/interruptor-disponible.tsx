"use client";

import { useActionState } from "react";
import { cambiarDisponibilidad } from "@/app/lib/acciones-viaje";
import { ESTADO_INICIAL } from "@/app/lib/estado-formulario";

// "Estás disponible": interruptor que llama a cambiar_disponibilidad. La base
// rechaza ponerse disponible sin vehículo o sin documentos aprobados (011) y
// retira las ofertas al desconectarse.
export function InterruptorDisponible({
  disponible,
  tieneVehiculo,
  verificado,
  resumen,
}: {
  disponible: boolean;
  tieneVehiculo: boolean;
  verificado: boolean;
  /** Línea con el resumen de la semana, debajo del interruptor. */
  resumen?: React.ReactNode;
}) {
  const [estado, accion, pendiente] = useActionState(cambiarDisponibilidad, ESTADO_INICIAL);
  return (
    <form action={accion} className="space-y-2">
      <input type="hidden" name="disponible" value={disponible ? "no" : "si"} />
      <div className={`space-y-2.5 rounded-[18px] p-[18px] ${disponible ? "bg-primario text-texto" : "bg-superficie text-texto"}`}>
        <div className="flex min-h-11 items-center gap-4">
          <div className="min-w-0 flex-1">
            <p id="etiqueta-disponible" className="font-titulo text-[22px] font-bold tracking-tight">
              {disponible ? "Estás disponible" : "No estás disponible"}
            </p>
            <p className={`text-sm ${disponible ? "text-texto" : "text-texto-suave"}`}>
              {disponible
                ? "Te llegan solicitudes de viaje."
                : !tieneVehiculo
                  ? "Registra tu vehículo para activarte."
                  : !verificado
                    ? "Podrás activarte cuando aprueben tus documentos."
                    : "Actívate para ver solicitudes."}
            </p>
          </div>
          <button
            type="submit"
            role="switch"
            aria-checked={disponible}
            aria-labelledby="etiqueta-disponible"
            disabled={pendiente || (!disponible && (!tieneVehiculo || !verificado))}
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-60 ${disponible ? "bg-texto" : "bg-texto-suave/40"}`}
          >
            <span
              aria-hidden="true"
              className={`absolute top-1 size-6 rounded-full transition-all motion-reduce:transition-none ${disponible ? "right-1 bg-primario" : "left-1 bg-texto"}`}
            />
          </button>
        </div>
        {resumen && (
          <p className={`border-t pt-2.5 text-sm tabular-nums ${disponible ? "border-texto/25 text-texto" : "border-texto-suave/15 text-texto-suave"}`}>
            {resumen}
          </p>
        )}
      </div>
      {estado.resultado === "error" && estado.mensaje && (
        <p role="alert" className="text-sm text-error">
          {estado.mensaje}
        </p>
      )}
    </form>
  );
}
