"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ESTADO_INICIAL, type EstadoFormulario } from "@/app/lib/estado-formulario";

// Botón que ejecuta una Server Action (aceptar una oferta, iniciar el viaje,
// cancelar...) con campos ocultos, y muestra el error si la regla lo rechaza.
// Cuando la acción es seria pide confirmación ahí mismo: el botón se vuelve la
// pregunta con "Sí" y "No" (sin la ventanita del navegador, que en cada
// celular se ve distinta y tapa la pantalla).

type Accion = (anterior: EstadoFormulario, formulario: FormData) => Promise<EstadoFormulario>;

const ESTILOS = {
  primario: "h-14 w-full rounded-xl bg-primario font-titulo text-base font-semibold text-texto hover:bg-primario/85",
  pequeno: "min-h-11 rounded-xl bg-primario px-5 font-titulo text-sm font-semibold text-texto hover:bg-primario/85",
  pequenoBorde: "min-h-11 rounded-xl border border-texto-suave/30 px-4 text-sm font-semibold text-texto hover:bg-superficie",
  borde: "min-h-12 w-full rounded-xl border border-texto-suave/30 font-semibold text-texto hover:bg-superficie",
  peligro: "min-h-12 w-full rounded-xl font-semibold text-error hover:bg-error/10",
  /** Peligro con borde: cancelar un viaje ya aceptado. */
  peligroBorde: "min-h-12 w-full rounded-xl border border-error/45 font-titulo font-semibold text-error hover:bg-error/10",
  /** Acción secundaria que no debe competir con el resto (cancelar una solicitud). */
  discreto: "min-h-11 w-full rounded-xl text-sm font-semibold text-texto-suave hover:text-texto",
  /** Botón redondo y pequeño de la cabecera (cambiar de modo). */
  pastilla:
    "flex h-11 items-center gap-2 rounded-full border border-texto-suave/25 bg-fondo px-3.5 text-sm font-semibold text-texto hover:bg-superficie",
} as const;

interface Props {
  accion: Accion;
  campos?: Record<string, string>;
  estilo?: keyof typeof ESTILOS;
  /** Texto mientras se envía. */
  enviando?: string;
  /** Si se da, pregunta esto antes de ejecutar. */
  confirmar?: string;
  /** Texto del botón que confirma (por defecto "Sí, continuar"). */
  textoSi?: string;
  /** Nombre para lectores de pantalla cuando el texto visible no basta. */
  etiqueta?: string;
  children: React.ReactNode;
}

export function BotonAccion({
  accion,
  campos = {},
  estilo = "primario",
  enviando = "Un momento…",
  confirmar,
  textoSi = "Sí, continuar",
  etiqueta,
  children,
}: Props) {
  const [estado, ejecutar, pendiente] = useActionState(accion, ESTADO_INICIAL);
  const [preguntando, setPreguntando] = useState(false);
  const pregunta = useRef<HTMLParagraphElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  // Al abrir la pregunta, el foco va a ella (el lector de pantalla la lee).
  useEffect(() => {
    if (preguntando) pregunta.current?.focus();
  }, [preguntando]);

  function cerrar() {
    setPreguntando(false);
    // Devuelve el foco al botón original para no perder el lugar.
    requestAnimationFrame(() => boton.current?.focus());
  }

  return (
    <form action={ejecutar}>
      {Object.entries(campos).map(([nombre, valor]) => (
        <input key={nombre} type="hidden" name={nombre} value={valor} />
      ))}

      {confirmar && preguntando ? (
        <div
          className="space-y-3 rounded-2xl border border-texto-suave/25 p-4"
          onKeyDown={(e) => {
            if (e.key === "Escape") cerrar();
          }}
        >
          <p ref={pregunta} tabIndex={-1} className="text-sm leading-relaxed text-texto outline-none">
            {confirmar}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={cerrar}
              disabled={pendiente}
              className="min-h-11 rounded-xl border border-texto-suave/30 text-sm font-semibold text-texto hover:bg-superficie disabled:opacity-70"
            >
              No
            </button>
            <button
              type="submit"
              disabled={pendiente}
              className={`min-h-11 rounded-xl text-sm font-semibold disabled:opacity-70 ${
                estilo === "peligro" || estilo === "peligroBorde" ? "bg-error/15 text-error hover:bg-error/25" : "bg-primario text-texto hover:bg-primario/85"
              }`}
            >
              {pendiente ? enviando : textoSi}
            </button>
          </div>
        </div>
      ) : (
        <button
          ref={boton}
          type={confirmar ? "button" : "submit"}
          onClick={confirmar ? () => setPreguntando(true) : undefined}
          disabled={pendiente}
          aria-label={etiqueta}
          className={`${ESTILOS[estilo]} transition-colors disabled:opacity-70`}
        >
          {pendiente ? enviando : children}
        </button>
      )}

      {estado.resultado === "error" && estado.mensaje && (
        <p role="alert" className="mt-2 text-center text-sm text-error">
          {estado.mensaje}
        </p>
      )}
    </form>
  );
}
