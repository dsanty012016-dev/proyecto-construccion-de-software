"use client";

import { useActionState } from "react";
import { ESTADO_INICIAL, type EstadoFormulario } from "@/app/lib/estado-formulario";

// Botón que ejecuta una Server Action (aceptar una oferta, iniciar el viaje,
// cancelar...) con campos ocultos, y muestra el error si la regla lo rechaza.
// Pide confirmación con el diálogo del navegador cuando la acción es seria.

type Accion = (anterior: EstadoFormulario, formulario: FormData) => Promise<EstadoFormulario>;

const ESTILOS = {
  primario: "h-14 w-full rounded-xl bg-primario font-titulo text-base font-semibold text-texto hover:bg-primario/85",
  pequeno: "min-h-11 rounded-xl bg-primario px-5 font-titulo text-sm font-semibold text-texto hover:bg-primario/85",
  pequenoBorde: "min-h-11 rounded-xl border border-texto-suave/30 px-4 text-sm font-semibold text-texto hover:bg-superficie",
  borde: "min-h-12 w-full rounded-xl border border-texto-suave/30 font-semibold text-texto hover:bg-superficie",
  peligro: "min-h-12 w-full rounded-xl font-semibold text-error hover:bg-error/10",
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
  /** Si se da, pregunta antes de ejecutar. */
  confirmar?: string;
  /** Nombre para lectores de pantalla cuando el texto visible no basta. */
  etiqueta?: string;
  children: React.ReactNode;
}

export function BotonAccion({ accion, campos = {}, estilo = "primario", enviando = "Un momento…", confirmar, etiqueta, children }: Props) {
  const [estado, ejecutar, pendiente] = useActionState(accion, ESTADO_INICIAL);
  return (
    <form
      action={ejecutar}
      onSubmit={(evento) => {
        if (confirmar && !window.confirm(confirmar)) evento.preventDefault();
      }}
    >
      {Object.entries(campos).map(([nombre, valor]) => (
        <input key={nombre} type="hidden" name={nombre} value={valor} />
      ))}
      <button type="submit" disabled={pendiente} aria-label={etiqueta} className={`${ESTILOS[estilo]} transition-colors disabled:opacity-70`}>
        {pendiente ? enviando : children}
      </button>
      {estado.resultado === "error" && estado.mensaje && (
        <p role="alert" className="mt-2 text-center text-sm text-error">
          {estado.mensaje}
        </p>
      )}
    </form>
  );
}
