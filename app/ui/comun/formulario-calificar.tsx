"use client";

import { useActionState, useId, useState } from "react";
import { calificarViaje } from "@/app/lib/acciones-viaje";
import { ESTADO_INICIAL, type EstadoFormulario } from "@/app/lib/estado-formulario";
import { Aviso, BotonEnviar } from "@/app/ui/auth/campos";
import { IconoEstrella } from "./iconos-app";

// De 1 a 5 estrellas y un comentario opcional. Las estrellas son botones de
// opción reales (se pueden elegir con teclado y lector de pantalla). Sirve
// para viajes (por defecto) y para los puestos de un cupo (014), que pasan su
// propia acción y sus campos ocultos.
type Accion = (anterior: EstadoFormulario, formulario: FormData) => Promise<EstadoFormulario>;

export function FormularioCalificar({
  campos,
  aQuien,
  accion: accionServidor = calificarViaje,
}: {
  campos: Record<string, string>;
  aQuien: string;
  accion?: Accion;
}) {
  const [estado, accion] = useActionState(accionServidor, ESTADO_INICIAL);
  const idComentario = useId();
  const [nota, setNota] = useState(Number(estado.valores?.estrellas ?? 5));
  const errores = estado.errores ?? {};

  return (
    <form action={accion} className="space-y-5" noValidate>
      {Object.entries(campos).map(([nombre, valor]) => (
        <input key={nombre} type="hidden" name={nombre} value={valor} />
      ))}
      {estado.resultado === "error" && estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}

      <fieldset className="space-y-3">
        <legend className="text-base font-bold">¿Cómo te fue con {aQuien}?</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="flex size-12 cursor-pointer items-center justify-center rounded-lg has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-secundario">
              <input
                type="radio"
                name="estrellas"
                value={n}
                checked={nota === n}
                onChange={() => setNota(n)}
                className="sr-only"
              />
              <span className="sr-only">
                {n} {n === 1 ? "estrella" : "estrellas"}
              </span>
              <IconoEstrella llena={n <= nota} className={`size-9 ${n <= nota ? "text-secundario" : "text-texto-suave/70"}`} />
            </label>
          ))}
        </div>
        {errores.estrellas && <p className="text-sm text-error">{errores.estrellas}</p>}
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor={idComentario} className="block text-sm font-medium">
          Comentario <span className="text-texto-suave">(opcional)</span>
        </label>
        <textarea
          id={idComentario}
          name="comentario"
          rows={3}
          maxLength={300}
          defaultValue={estado.valores?.comentario}
          placeholder="Puntual y amable…"
          aria-invalid={errores.comentario ? true : undefined}
          className="w-full resize-none rounded-xl border border-texto-suave/60 bg-superficie p-3 text-texto outline-none placeholder:text-texto-suave focus:border-secundario aria-[invalid=true]:border-error"
        />
        {errores.comentario && <p className="text-sm text-error">{errores.comentario}</p>}
      </div>

      <BotonEnviar enviando="Enviando…">Enviar calificación</BotonEnviar>
    </form>
  );
}
