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
      {/* Sobre el azul se conserva la paleta oscura (texto blanco) también en modo claro. */}
      <div data-tema={disponible ? "oscuro" : undefined} className={`space-y-2.5 rounded-2xl p-[18px] text-texto ${disponible ? "zona-azul bg-primario" : "bg-superficie"}`}>
        <div className="flex min-h-11 flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1 basis-[10em]">
            <p id="etiqueta-disponible" className="cartel text-[2rem] [overflow-wrap:anywhere]">
              {disponible ? "Estás disponible" : "No estás disponible"}
            </p>
            <p className={`mt-1 text-sm ${disponible ? "text-texto" : "text-texto-suave"}`}>
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
            className="ml-auto flex min-h-11 w-14 shrink-0 items-center justify-center rounded-full disabled:opacity-60"
          >
            <span
              aria-hidden="true"
              className={`relative block h-8 w-14 rounded-full transition-colors ${disponible ? "bg-texto" : "bg-texto-suave/40"}`}
            >
              <span className={`absolute top-1 size-6 rounded-full transition-[left,right,background-color] motion-reduce:transition-none ${disponible ? "right-1 bg-primario" : "left-1 bg-texto"}`} />
            </span>
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
