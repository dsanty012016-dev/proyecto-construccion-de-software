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
}: {
  disponible: boolean;
  tieneVehiculo: boolean;
  verificado: boolean;
}) {
  const [estado, accion, pendiente] = useActionState(cambiarDisponibilidad, ESTADO_INICIAL);
  return (
    <form action={accion} className="space-y-2">
      <input type="hidden" name="disponible" value={disponible ? "no" : "si"} />
      <div className={`flex items-center gap-4 rounded-2xl p-5 ${disponible ? "bg-primario text-texto" : "bg-superficie text-texto"}`}>
        <div className="min-w-0 flex-1">
          <p id="etiqueta-disponible" className="font-titulo text-lg font-bold">
            {disponible ? "Estás disponible" : "No estás disponible"}
          </p>
          <p className={`text-sm ${disponible ? "text-texto" : "text-texto-suave"}`}>
            {disponible
              ? "Recibirás solicitudes de viaje."
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
          className={`relative h-9 w-16 shrink-0 rounded-full transition-colors disabled:opacity-60 ${disponible ? "bg-texto" : "bg-texto-suave/40"}`}
        >
          <span
            aria-hidden="true"
            className={`absolute top-1 size-7 rounded-full transition-all ${disponible ? "right-1 bg-primario" : "left-1 bg-texto"}`}
          />
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
