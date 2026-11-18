"use client";

import { useActionState, useId, useState } from "react";
import { ofertarViaje } from "@/app/lib/acciones-viaje";
import { comision, gananciaConductor, PORCENTAJE_COMISION } from "@/app/lib/comision";
import { ESTADO_INICIAL } from "@/app/lib/estado-formulario";
import { pesos } from "@/app/lib/formato";
import { PRECIO_MAXIMO, PRECIO_MINIMO } from "@/app/lib/viaje";
import { Aviso, BotonEnviar } from "@/app/ui/auth/campos";
import { IconoMas, IconoMenos } from "@/app/ui/comun/iconos-app";

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

      <section aria-labelledby={`${idPrecio}-titulo`} className="space-y-4 rounded-2xl bg-superficie p-5">
        <label id={`${idPrecio}-titulo`} htmlFor={idPrecio} className="block text-center text-sm font-semibold text-texto-suave">
          Tu precio
        </label>
        <div className="space-y-3">
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
            className="min-h-14 w-full min-w-0 rounded-xl bg-transparent py-2 text-center cifra text-[clamp(1.5rem,12vw,3rem)] text-texto placeholder:text-texto-suave"
          />
          <div className="flex justify-center gap-6">
            <button
              type="button"
              onClick={() => mover(-PASO)}
              aria-label={`Bajar ${pesos(PASO)}`}
              className="flex size-14 shrink-0 items-center justify-center rounded-full border border-texto-suave/30 text-texto hover:bg-fondo"
            >
              <IconoMenos className="size-[22px]" />
            </button>
            <button
              type="button"
              onClick={() => mover(PASO)}
              aria-label={`Subir ${pesos(PASO)}`}
              className="flex size-14 shrink-0 items-center justify-center rounded-full border border-texto-suave/30 text-texto hover:bg-fondo"
            >
              <IconoMas className="size-[22px]" />
            </button>
          </div>
        </div>
        <p id={`${idPrecio}-ayuda`} className={`text-center text-[13px] ${estado.errores?.precio ? "text-error" : "text-texto-suave"}`}>
          {estado.errores?.precio ?? `Entre ${pesos(PRECIO_MINIMO)} y ${pesos(PRECIO_MAXIMO)}, en pesos.`}
        </p>
        <dl className="space-y-2 border-t border-dashed border-texto-suave/40 pt-3.5 text-sm tabular-nums" aria-live="polite">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <dt className="min-w-0 flex-1 basis-40 text-texto-suave">Comisión UniGo ({PORCENTAJE_COMISION} %)</dt>
            <dd className="text-texto-suave">{valido ? `−${pesos(comision(numero))}` : "—"}</dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <dt className="min-w-0 flex-1 basis-40 font-bold">Recibes al terminar</dt>
            <dd className={`text-secundario ${valido ? "cifra text-2xl" : "font-bold"}`}>{valido ? pesos(gananciaConductor(numero)) : "—"}</dd>
          </div>
        </dl>
      </section>

      <BotonEnviar enviando="Enviando oferta…">{valido ? `Enviar oferta de ${pesos(numero)}` : "Enviar oferta"}</BotonEnviar>
      <p className="text-center text-[13px] leading-relaxed text-texto-suave">
        Puedes retirarla mientras no la acepten. Si la aceptan y luego cancelas, el estudiante recupera todo y sumas una falta.
      </p>
    </form>
  );
}
