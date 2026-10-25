"use client";

import { useActionState, useId, useRef, useState } from "react";
import { recargar } from "@/app/lib/acciones-billetera";
import { ESTADO_INICIAL } from "@/app/lib/estado-formulario";
import { pesos } from "@/app/lib/formato";
import { RECARGA_MINIMA } from "@/app/lib/pagos";
import { Aviso, BotonEnviar } from "@/app/ui/auth/campos";

// Recarga de saldo de prueba (rediseño): tres montos rápidos y "Otro" para
// escribir uno libre desde $2.000. La base vuelve a validar el monto.
const ATAJOS = [5_000, 10_000, 20_000];

export function FormularioRecarga() {
  const [estado, accion] = useActionState(recargar, ESTADO_INICIAL);
  const [monto, setMonto] = useState(estado.valores?.monto ?? String(ATAJOS[1]));
  const [otro, setOtro] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const id = useId();
  const numero = Number(monto);
  const conError = !!estado.errores?.monto;
  const escribiendo = otro || conError || (monto !== "" && !ATAJOS.includes(numero));

  return (
    <form action={accion} className="space-y-3" noValidate>
      {estado.resultado === "listo" && <Aviso tipo="listo">{estado.mensaje}</Aviso>}
      {estado.resultado === "error" && estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}

      <div role="group" aria-label="Monto a recargar" className="grid grid-cols-4 gap-2">
        {ATAJOS.map((valor) => {
          const elegido = !escribiendo && numero === valor;
          return (
            <button
              key={valor}
              type="button"
              onClick={() => {
                setOtro(false);
                setMonto(String(valor));
              }}
              aria-pressed={elegido}
              className={`min-h-11 rounded-xl font-titulo text-sm tabular-nums ${
                elegido ? "border-2 border-secundario bg-secundario/10 font-bold text-texto" : "border border-texto-suave/30 font-semibold text-texto"
              }`}
            >
              {pesos(valor)}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setOtro(true);
            setMonto("");
            // El campo aparece en este mismo render; se enfoca después.
            setTimeout(() => campo.current?.focus(), 0);
          }}
          aria-pressed={escribiendo}
          className={`min-h-11 rounded-xl text-sm ${
            escribiendo ? "border-2 border-secundario bg-secundario/10 font-bold text-texto" : "border border-texto-suave/30 font-semibold text-texto"
          }`}
        >
          Otro
        </button>
      </div>

      {escribiendo ? (
        <div>
          <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
            ¿Cuánto quieres recargar?
          </label>
          <input
            ref={campo}
            id={id}
            name="monto"
            inputMode="numeric"
            autoComplete="off"
            placeholder={`Desde ${pesos(RECARGA_MINIMA)}`}
            value={monto}
            onChange={(e) => setMonto(e.target.value.replace(/\D/g, "").slice(0, 6))}
            aria-invalid={conError ? true : undefined}
            aria-describedby={`${id}-ayuda`}
            className="h-12 w-full rounded-xl border border-texto-suave/60 bg-superficie px-4 font-titulo text-lg text-texto tabular-nums outline-none placeholder:text-texto-suave focus:border-secundario aria-[invalid=true]:border-error"
          />
        </div>
      ) : (
        <input type="hidden" name="monto" value={monto} />
      )}

      <BotonEnviar enviando="Recargando…">{numero >= RECARGA_MINIMA ? `Recargar ${pesos(numero)}` : "Recargar"}</BotonEnviar>
      <p id={`${id}-ayuda`} className={`text-xs ${conError ? "text-error" : "text-texto-suave"}`}>
        {estado.errores?.monto ?? `Desde ${pesos(RECARGA_MINIMA)}. Es dinero simulado mientras llega el pago real.`}
      </p>
    </form>
  );
}
