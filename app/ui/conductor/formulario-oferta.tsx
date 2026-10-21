"use client";

import { useActionState, useId, useState } from "react";
import { ofertarViaje } from "@/app/lib/acciones-viaje";
import { gananciaConductor, PORCENTAJE_COMISION } from "@/app/lib/comision";
import { ESTADO_INICIAL } from "@/app/lib/estado-formulario";
import { pesos } from "@/app/lib/formato";
import { PRECIO_MAXIMO, PRECIO_MINIMO } from "@/app/lib/viaje";
import { Aviso, BotonEnviar } from "@/app/ui/auth/campos";

// El conductor escribe su precio (con − y + de a $500) y ve cuánto recibe
// después de la comisión de UniGo. La regla de los límites la repite la base.

const PASO = 500;
const PRECIO_INICIAL_AL_SUBIR = 5000;

export function FormularioOferta({ viajeId, precioActual }: { viajeId: string; precioActual?: number }) {
  const [estado, accion] = useActionState(ofertarViaje, ESTADO_INICIAL);
  const [precio, setPrecio] = useState<string>(precioActual ? String(precioActual) : (estado.valores?.precio ?? ""));
  const idPrecio = useId();
  const numero = Number(precio);
  const valido = precio !== "" && Number.isInteger(numero) && numero >= PRECIO_MINIMO && numero <= PRECIO_MAXIMO;

  function mover(delta: number) {
    const base = precio === "" || !Number.isFinite(numero) ? PRECIO_INICIAL_AL_SUBIR : numero;
    const nuevo = Math.min(PRECIO_MAXIMO, Math.max(PRECIO_MINIMO, base + delta));
    setPrecio(String(nuevo));
  }

  return (
    <form action={accion} className="space-y-4" noValidate>
      <input type="hidden" name="viaje" value={viajeId} />
      {estado.resultado === "error" && estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}

      <div className="space-y-2">
        <label htmlFor={idPrecio} className="block text-base font-bold">
          Tu precio
        </label>
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-superficie p-2">
          <button
            type="button"
            onClick={() => mover(-PASO)}
            aria-label={`Bajar ${PASO} pesos`}
            className="size-13 shrink-0 rounded-xl border border-texto-suave/30 text-2xl text-texto hover:bg-fondo"
          >
            −
          </button>
          <input
            id={idPrecio}
            name="precio"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            placeholder="0"
            value={precio}
            onChange={(e) => setPrecio(e.target.value.replace(/\D/g, "").slice(0, 6))}
            aria-invalid={estado.errores?.precio ? true : undefined}
            aria-describedby={`${idPrecio}-ayuda`}
            className="h-13 min-w-0 flex-1 bg-transparent text-center font-titulo text-3xl font-bold text-texto outline-none placeholder:text-texto-suave/60"
          />
          <button
            type="button"
            onClick={() => mover(PASO)}
            aria-label={`Subir ${PASO} pesos`}
            className="size-13 shrink-0 rounded-xl border border-texto-suave/30 text-2xl text-texto hover:bg-fondo"
          >
            +
          </button>
        </div>
        <p id={`${idPrecio}-ayuda`} className={`text-sm ${estado.errores?.precio ? "text-error" : "text-texto-suave"}`}>
          {estado.errores?.precio ?? `Entre ${pesos(PRECIO_MINIMO)} y ${pesos(PRECIO_MAXIMO)}, en pesos enteros.`}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl bg-superficie p-4" aria-live="polite">
        <div>
          <p className="text-sm text-texto-suave">Recibes en tu billetera</p>
          <p className="text-xs text-texto-suave">Después del {PORCENTAJE_COMISION} % de UniGo</p>
        </div>
        <p className="font-titulo text-xl font-bold">{valido ? pesos(gananciaConductor(numero)) : "—"}</p>
      </div>

      <BotonEnviar enviando="Enviando oferta…">{valido ? `Enviar oferta de ${pesos(numero)}` : "Enviar oferta"}</BotonEnviar>
      <p className="text-center text-sm text-texto-suave">Puedes retirar la oferta mientras el estudiante no la acepte.</p>
    </form>
  );
}
