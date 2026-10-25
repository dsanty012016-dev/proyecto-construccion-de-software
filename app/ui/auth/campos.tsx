"use client";

import { useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { IconoOjo, IconoOjoTachado } from "./iconos-auth";

// Piezas de los formularios de acceso: campo con etiqueta y error, campo de
// contraseña con botón para verla, botón de enviar y mensajes.

const estiloEntrada =
  "h-12 w-full rounded-xl border bg-superficie text-texto placeholder:text-texto-suave/70 outline-none transition-colors focus:border-secundario aria-[invalid=true]:border-error";

interface PropsCampo extends React.InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string;
  error?: string;
  icono?: React.ReactNode;
  /** Contenido a la izquierda dentro del campo, por ejemplo "+57". */
  prefijo?: string;
}

export function Campo({ etiqueta, error, icono, prefijo, className, ...resto }: PropsCampo) {
  const id = useId();
  const idError = `${id}-error`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {etiqueta}
      </label>
      <div className="relative">
        {icono && (
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-texto-suave">
            {icono}
          </span>
        )}
        {prefijo && (
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-texto-suave">
            {prefijo}
          </span>
        )}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? idError : undefined}
          className={`${estiloEntrada} ${icono || prefijo ? "pl-11" : "pl-4"} pr-4 ${error ? "" : "border-superficie"}`}
          {...resto}
        />
      </div>
      {error && (
        <p id={idError} className="mt-1.5 text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}

interface PropsClave extends Omit<PropsCampo, "type" | "icono" | "prefijo"> {
  icono?: React.ReactNode;
}

export function CampoClave({ etiqueta, error, icono, className, ...resto }: PropsClave) {
  const id = useId();
  const idError = `${id}-error`;
  const [visible, setVisible] = useState(false);
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {etiqueta}
      </label>
      <div className="relative">
        {icono && (
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-texto-suave">
            {icono}
          </span>
        )}
        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? idError : undefined}
          className={`${estiloEntrada} ${icono ? "pl-11" : "pl-4"} pr-12 ${error ? "" : "border-superficie"}`}
          {...resto}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-texto-suave hover:text-texto"
        >
          {visible ? <IconoOjoTachado /> : <IconoOjo />}
        </button>
      </div>
      {error && (
        <p id={idError} className="mt-1.5 text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function BotonEnviar({ children, enviando, deshabilitado }: { children: React.ReactNode; enviando: string; deshabilitado?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || deshabilitado}
      className="flex h-12 w-full items-center justify-center rounded-xl bg-primario font-semibold text-texto transition-colors hover:bg-primario/85 disabled:opacity-70"
    >
      {pending ? enviando : children}
    </button>
  );
}

export function Aviso({ tipo, children }: { tipo: "error" | "listo" | "info"; children: React.ReactNode }) {
  const estilos = {
    error: "border-error/40 bg-error/10 text-error",
    listo: "border-secundario/40 bg-secundario/10 text-texto",
    info: "border-superficie bg-superficie text-texto-suave",
  };
  return (
    <div role={tipo === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${estilos[tipo]}`}>
      {children}
    </div>
  );
}
