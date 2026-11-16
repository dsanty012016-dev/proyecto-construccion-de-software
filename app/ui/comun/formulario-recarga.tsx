"use client";

import { useActionState, useId, useRef, useState } from "react";
import { iniciarRecarga, recargar } from "@/app/lib/acciones-billetera";
import { ESTADO_INICIAL } from "@/app/lib/estado-formulario";
import { pesos } from "@/app/lib/formato";
import { RECARGA_MAXIMA, RECARGA_MINIMA, SALDO_MAXIMO } from "@/app/lib/pagos";
import type { ModoDeRecarga } from "@/app/lib/pasarela";
import { Aviso, BotonEnviar } from "@/app/ui/auth/campos";

// Recarga de saldo: tres montos rápidos y "Otro" para escribir uno libre
// desde la recarga mínima. La base vuelve a validar el monto. Según el modo:
// - "prueba": no hay pasarela; suma saldo simulado al instante.
// - "wompi-pruebas" y "wompi": abre la recarga y manda a pagar a la página de
//   Wompi (en pruebas, sin dinero real). El saldo llega cuando Wompi confirma.
const ATAJOS = [20_000, 50_000, 100_000];

const AYUDA: Record<ModoDeRecarga, string> = {
  prueba: "Es dinero simulado mientras llega el pago real.",
  "wompi-pruebas": "Pagas en la página de Wompi, en modo de pruebas: no se cobra dinero real.",
  wompi: "Pagas con Nequi, PSE, Bancolombia o tarjeta en la página de Wompi y recibes el monto completo.",
};

export function FormularioRecarga({ modo, saldo = 0 }: { modo: ModoDeRecarga; saldo?: number }) {
  const conWompi = modo !== "prueba";
  const [estado, accion, pendiente] = useActionState(conWompi ? iniciarRecarga : recargar, ESTADO_INICIAL);
  const [monto, setMonto] = useState(estado.valores?.monto ?? String(ATAJOS[0]));
  const [otro, setOtro] = useState(false);
  const [editado, setEditado] = useState(false);
  const [intentado, setIntentado] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const id = useId();
  const numero = Number(monto);
  const limite = Math.max(0, Math.min(RECARGA_MAXIMA, SALDO_MAXIMO - saldo));
  const valido = /^\d+$/.test(monto) && Number.isInteger(numero) && numero >= RECARGA_MINIMA && numero <= limite;
  const errorServidor = !editado && estado.valores?.monto === monto ? estado.errores?.monto : undefined;
  const errorMonto = intentado && !valido ? `La recarga debe ser entre ${pesos(RECARGA_MINIMA)} y ${pesos(limite)}.` : errorServidor;
  const conError = !!errorMonto;
  const escribiendo = otro || conError || (monto !== "" && !ATAJOS.includes(numero));

  if (limite < RECARGA_MINIMA) return <Aviso tipo="info">Tu saldo está cerca del límite de {pesos(SALDO_MAXIMO)}. No necesitas recargar en este momento.</Aviso>;

  return (
    <form action={accion} className="space-y-3" noValidate onSubmit={(evento) => {
      setEditado(false);
      setIntentado(true);
      if (!valido) { evento.preventDefault(); campo.current?.focus(); }
    }}>
      {estado.resultado === "listo" && <Aviso tipo="listo">{estado.mensaje}</Aviso>}
      {!editado && estado.resultado === "error" && estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}

      <div role="group" aria-label="Monto a recargar" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9.5rem),1fr))] gap-2">
        {ATAJOS.map((valor) => {
          const elegido = !escribiendo && numero === valor;
          return (
            <button
              key={valor}
              type="button"
              onClick={() => {
                setOtro(false);
                setMonto(String(valor));
                setEditado(true);
                setIntentado(false);
              }}
              disabled={pendiente || valor > limite}
              aria-pressed={elegido}
              className={`min-h-11 rounded-xl px-2 font-titulo text-sm tabular-nums disabled:opacity-50 ${
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
            setEditado(true);
            setIntentado(false);
            // El campo aparece en este mismo render; se enfoca después.
            setTimeout(() => campo.current?.focus(), 0);
          }}
          disabled={pendiente}
          aria-pressed={escribiendo}
          className={`min-h-11 rounded-xl px-3 text-sm ${
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
            onChange={(e) => { setMonto(e.target.value.replace(/\D/g, "").slice(0, 6)); setEditado(true); setIntentado(false); }}
            disabled={pendiente}
            aria-invalid={conError ? true : undefined}
            aria-describedby={`${id}-ayuda`}
            className="h-12 w-full rounded-xl border border-texto-suave/60 bg-superficie px-4 font-titulo text-lg text-texto tabular-nums outline-none placeholder:text-texto-suave focus:border-secundario aria-[invalid=true]:border-error"
          />
        </div>
      ) : (
        <input type="hidden" name="monto" value={monto} />
      )}

      <BotonEnviar enviando={conWompi ? "Abriendo Wompi…" : "Recargando…"}>
        {numero >= RECARGA_MINIMA ? `${conWompi ? "Pagar" : "Recargar"} ${pesos(numero)}` : conWompi ? "Pagar" : "Recargar"}
      </BotonEnviar>
      <p id={`${id}-ayuda`} aria-live="polite" className={`text-sm ${conError ? "text-error" : "text-texto-suave"}`}>
        {errorMonto ?? `Entre ${pesos(RECARGA_MINIMA)} y ${pesos(limite)}. ${AYUDA[modo]}`}
      </p>
    </form>
  );
}
