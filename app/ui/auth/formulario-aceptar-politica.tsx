"use client";

import { useActionState, useId } from "react";
import { aceptarPolitica } from "@/app/lib/acciones-auth";
import { ESTADO_INICIAL } from "@/app/lib/estado-formulario";
import { Aviso, BotonEnviar } from "./campos";

// Casilla obligatoria para aceptar la política vigente (016).
export function FormularioAceptarPolitica() {
  const [estado, accion] = useActionState(aceptarPolitica, ESTADO_INICIAL);
  const id = useId();
  const error = estado.errores?.acepto;
  return (
    <form action={accion} className="space-y-5" noValidate>
      {estado.resultado === "error" && estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}
      <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold">
        Leer la política de privacidad<span className="sr-only"> (se abre en otra pestaña)</span>
      </a>
      <div>
        <div className="flex items-start gap-3">
          <input
            id={id}
            name="acepto"
            type="checkbox"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className="mt-0.5 size-5 shrink-0 accent-primario"
          />
          <label htmlFor={id} className="text-sm leading-relaxed text-texto-suave">
            Leí y acepto la política de privacidad de UniGo y autorizo el tratamiento de mis datos.
          </label>
        </div>
        {error && (
          <p id={`${id}-error`} className="mt-1.5 text-sm text-error">
            {error}
          </p>
        )}
      </div>
      <BotonEnviar enviando="Guardando…">Aceptar y continuar</BotonEnviar>
    </form>
  );
}
