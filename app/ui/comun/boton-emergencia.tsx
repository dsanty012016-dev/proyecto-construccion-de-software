"use client";

import { useId, useRef, useState } from "react";
import { reportarEmergencia } from "@/app/lib/acciones-emergencia";
import { ENLACE_LLAMADA_EMERGENCIA, NUMERO_EMERGENCIAS } from "@/app/lib/emergencia";
import { BotonCompartirViaje } from "@/app/ui/estudiante/boton-compartir-viaje";

// Botón de emergencia en viajes y cupos activos. El primer toque abre el panel
// (así no se llama por accidente); ahí "Llamar al 123" marca y, a la vez, avisa
// al equipo de UniGo con la ubicación del teléfono si la da en pocos segundos.
// También se puede solo avisar al equipo y, el estudiante, compartir el viaje.

type Aviso = { tipo: "enviando" } | { tipo: "listo" } | { tipo: "error"; texto: string } | null;

function ubicacionRapida(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolver) => {
    if (!("geolocation" in navigator)) return resolver(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolver({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolver(null),
      { enableHighAccuracy: true, timeout: 6_000, maximumAge: 60_000 },
    );
  });
}

export function BotonEmergencia({
  viaje,
  cupo,
  compartir,
}: {
  viaje?: string;
  cupo?: string;
  /** Solo para el estudiante: crea el enlace del viaje en vivo. */
  compartir?: () => Promise<{ token?: string; mensaje?: string }>;
}) {
  const panel = useRef<HTMLDialogElement>(null);
  const [aviso, setAviso] = useState<Aviso>(null);
  const idTitulo = useId();

  async function avisarAlEquipo() {
    if (aviso?.tipo === "enviando" || aviso?.tipo === "listo") return;
    setAviso({ tipo: "enviando" });
    const aqui = await ubicacionRapida();
    try {
      const r = await reportarEmergencia({ viaje, cupo, ...(aqui ?? {}) });
      setAviso(r.ok ? { tipo: "listo" } : { tipo: "error", texto: r.mensaje ?? "No pudimos avisar al equipo." });
    } catch {
      setAviso({ tipo: "error", texto: "Sin conexión: no pudimos avisar al equipo. Llama al 123." });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => panel.current?.showModal()}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-error/60 px-4 font-titulo font-bold text-error hover:bg-error/10"
      >
        <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3l9 16H3z" />
          <path d="M12 10v4M12 17h.01" />
        </svg>
        Emergencia
      </button>

      <dialog
        ref={panel}
        aria-labelledby={idTitulo}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-[var(--radio-panel)] border border-linea bg-fondo p-0 text-texto backdrop:bg-noche/70"
      >
        <div className="space-y-4 p-5">
          <div className="space-y-1">
            <h2 id={idTitulo} className="cartel text-[2rem] leading-none">
              ¿Necesitas ayuda?
            </h2>
            <p className="text-sm text-texto-suave">El {NUMERO_EMERGENCIAS} es la línea de emergencias de Colombia: policía, ambulancia y bomberos.</p>
          </div>

          <a
            href={ENLACE_LLAMADA_EMERGENCIA}
            onClick={() => void avisarAlEquipo()}
            className="flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-error px-4 font-titulo text-xl font-bold text-fondo hover:bg-error/90"
          >
            <svg viewBox="0 0 24 24" className="size-6 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2" />
            </svg>
            Llamar al {NUMERO_EMERGENCIAS}
          </a>
          <p className="text-xs text-texto-suave">Al llamar también avisamos al equipo de UniGo con tu ubicación.</p>

          <button
            type="button"
            onClick={() => void avisarAlEquipo()}
            disabled={aviso?.tipo === "enviando" || aviso?.tipo === "listo"}
            className="min-h-12 w-full rounded-xl border border-texto-suave/30 px-4 font-semibold text-texto hover:bg-superficie disabled:opacity-70"
          >
            {aviso?.tipo === "enviando" ? "Avisando al equipo…" : aviso?.tipo === "listo" ? "Equipo de UniGo avisado" : "Solo avisar al equipo de UniGo"}
          </button>
          {aviso?.tipo === "listo" && (
            <p role="status" className="text-center text-[13px] text-texto-suave">
              El equipo recibió tu aviso con el viaje y tu ubicación.
            </p>
          )}
          {aviso?.tipo === "error" && (
            <p role="alert" className="text-center text-[13px] text-error">
              {aviso.texto}
            </p>
          )}

          {compartir && <BotonCompartirViaje compartir={compartir} />}

          <form method="dialog">
            <button type="submit" className="min-h-11 w-full rounded-xl text-sm font-semibold text-texto-suave hover:text-texto">
              Cerrar
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
