"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { celebrarLogro, logrosPendientes } from "@/app/lib/acciones-logros";
import { LOGROS, type IdLogro } from "@/app/lib/mascota";
import { UniMascota } from "./uni-mascota";

// Cuando la persona alcanza un logro (primer viaje, 10 viajes, primeras 5
// estrellas), Uni lo celebra en una ventana encima de la app, una sola vez.
// Revisa al entrar, al cambiar de pantalla y al volver a la app.

export function CelebracionLogros() {
  const [cola, setCola] = useState<IdLogro[]>([]);
  const ruta = usePathname();
  const boton = useRef<HTMLButtonElement>(null);
  const idTitulo = useId();
  const idTexto = useId();
  const actual = cola[0];

  useEffect(() => {
    let vigente = true;
    const revisar = () => {
      logrosPendientes()
        .then((pendientes) => {
          if (vigente && pendientes.length > 0) setCola(pendientes);
        })
        .catch(() => {
          // Sin conexión no se celebra; se intentará en la próxima pantalla.
        });
    };
    revisar();
    const alVolver = () => document.visibilityState === "visible" && revisar();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      vigente = false;
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [ruta]);

  useEffect(() => {
    if (actual) boton.current?.focus();
  }, [actual]);

  if (!actual) return null;
  const logro = LOGROS[actual];

  function seguir() {
    celebrarLogro(actual).catch(() => {});
    setCola((c) => c.slice(1));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-noche/75 p-5" onKeyDown={(e) => e.key === "Escape" && seguir()}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={idTexto}
        className="uni-entrar flex w-full max-w-sm flex-col items-center gap-3 rounded-[var(--radio-panel)] border border-linea bg-superficie p-6 text-center text-texto shadow-2xl"
      >
        <UniMascota expresion="celebrando" className="h-44 w-auto" />
        <p className="text-xs font-bold tracking-[0.2em] text-secundario uppercase">Logro desbloqueado</p>
        <h2 id={idTitulo} className="cartel text-[2rem] leading-none">
          {logro.titulo}
        </h2>
        <p id={idTexto} className="text-sm leading-relaxed text-texto-suave">
          {logro.texto}
        </p>
        <button
          ref={boton}
          type="button"
          onClick={seguir}
          className="prensa mt-2 min-h-12 w-full rounded-xl bg-primario font-titulo font-semibold text-sobre-primario hover:bg-primario/85"
        >
          ¡Bacano!
        </button>
      </section>
    </div>
  );
}
