"use client";

import { useId } from "react";
import { PALABRAS, SENTIDOS, type Sentido } from "@/app/lib/sentido";

// Ida (a la U) o regreso (de la U a la casa), como dos botones de radio que
// se ven como una sola barra. Manda "sentido" con el formulario.

interface Props {
  valor: Sentido;
  alCambiar: (sentido: Sentido) => void;
  /** Lo que se pregunta, por ejemplo "¿Para dónde vas?". */
  pregunta: string;
}

export function SelectorSentido({ valor, alCambiar, pregunta }: Props) {
  const id = useId();
  return (
    <fieldset>
      <legend className="mb-2 text-base font-semibold">{pregunta}</legend>
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-superficie p-1">
        {SENTIDOS.map((sentido) => (
          <label
            key={sentido}
            htmlFor={`${id}-${sentido}`}
            className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl px-3 text-center text-sm font-semibold text-texto-suave transition-colors has-[:checked]:bg-primario has-[:checked]:text-texto has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-secundario"
          >
            <input
              id={`${id}-${sentido}`}
              type="radio"
              name="sentido"
              value={sentido}
              checked={valor === sentido}
              onChange={() => alCambiar(sentido)}
              className="sr-only"
            />
            {PALABRAS[sentido].corto}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
