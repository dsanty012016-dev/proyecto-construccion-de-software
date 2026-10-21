"use client";

import { useActionState, useId, useState } from "react";
import { recargar } from "@/app/lib/acciones-billetera";
import { ESTADO_INICIAL } from "@/app/lib/estado-formulario";
import { pesos } from "@/app/lib/formato";
import { RECARGA_MINIMA } from "@/app/lib/pagos";
import { Aviso, BotonEnviar } from "@/app/ui/auth/campos";

// Recarga de saldo de prueba: monto libre desde $2.000, con atajos.
const ATAJOS = [10_000, 20_000, 50_000];

export function FormularioRecarga() {
  const [estado, accion] = useActionState(recargar, ESTADO_INICIAL);
  const [monto, setMonto] = useState(estado.valores?.monto ?? "");
  const id = useId();
  const numero = Number(monto);
  return (
    <form action={accion} className="space-y-3" noValidate>
      {estado.resultado === "listo" && <Aviso tipo="listo">{estado.mensaje}</Aviso>}
      {estado.resultado === "error" && estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}
      <label htmlFor={id} className="block text-sm font-medium">
        ¿Cuánto quieres recargar?
      </label>
      <input
        id={id}
        name="monto"
        inputMode="numeric"
        autoComplete="off"
        placeholder={`Desde ${pesos(RECARGA_MINIMA)}`}
        value={monto}
        onChange={(e) => setMonto(e.target.value.replace(/\D/g, "").slice(0, 6))}
        aria-invalid={estado.errores?.monto ? true : undefined}
        aria-describedby={`${id}-ayuda`}
        className="h-12 w-full rounded-xl border border-superficie bg-fondo px-4 font-titulo text-lg text-texto outline-none placeholder:text-texto-suave/70 focus:border-secundario aria-[invalid=true]:border-error"
      />
      <p id={`${id}-ayuda`} className={`text-sm ${estado.errores?.monto ? "text-error" : "text-texto-suave"}`}>
        {estado.errores?.monto ?? "Saldo de prueba: no se cobra dinero real."}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {ATAJOS.map((valor) => (
          <button
            key={valor}
            type="button"
            onClick={() => setMonto(String(valor))}
            aria-pressed={numero === valor}
            className={`min-h-11 rounded-xl border text-sm font-semibold ${numero === valor ? "border-secundario text-secundario" : "border-texto-suave/30 text-texto"}`}
          >
            {pesos(valor)}
          </button>
        ))}
      </div>
      <BotonEnviar enviando="Recargando…">{numero >= RECARGA_MINIMA ? `Recargar ${pesos(numero)}` : "Recargar"}</BotonEnviar>
    </form>
  );
}
