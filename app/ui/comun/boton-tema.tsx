"use client";

import { cambiarTemaInvadiendo } from "./tema-navegador";

// Botón de modo claro / modo oscuro, arriba en cada pantalla. Lleva los dos
// iconos y globals.css muestra el del modo al que se pasa (sol en oscuro, luna
// en claro): así el servidor y el navegador pintan lo mismo y no hay parpadeo.
// La elección se guarda en este navegador (tema-navegador.ts). Al tocarlo, el
// modo nuevo invade la pantalla desde el botón.
export function BotonTema({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={(evento) => cambiarTemaInvadiendo(evento.currentTarget)}
      aria-label="Cambiar entre modo claro y modo oscuro"
      title="Modo claro u oscuro"
      className={`flex size-11 shrink-0 items-center justify-center rounded-full text-texto-suave transition-colors hover:bg-superficie hover:text-texto motion-reduce:transition-none ${className}`}
    >
      {/* Sol: se ve en oscuro. */}
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="solo-oscuro size-5">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      {/* Luna: se ve en claro. */}
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="solo-claro size-5">
        <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
      </svg>
    </button>
  );
}
