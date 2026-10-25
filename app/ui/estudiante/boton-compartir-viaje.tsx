"use client";

import { useId, useState, useTransition } from "react";
import { enlaceCompartido } from "@/app/lib/seguimiento";
import { IconoCompartir } from "@/app/ui/comun/iconos-app";

// "Compartir viaje": crea (o recupera) el enlace del viaje o del puesto del
// cupo y abre el menú de compartir del teléfono; si no hay, lo copia. Quien
// lo abra ve el viaje en vivo sin iniciar sesión hasta que termine (013, 014).
// Recibe la acción ya atada a su viaje o cupo (compartirViaje.bind).
export function BotonCompartirViaje({ compartir: pedirEnlace }: { compartir: () => Promise<{ token?: string; mensaje?: string }> }) {
  const [pendiente, empezar] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: "listo" | "error"; texto: string } | null>(null);
  const [enlace, setEnlace] = useState<string | null>(null);
  const idEnlace = useId();

  function compartir() {
    setAviso(null);
    empezar(async () => {
      const respuesta = await pedirEnlace();
      if (!respuesta.token) {
        setAviso({ tipo: "error", texto: respuesta.mensaje ?? "No pudimos crear el enlace." });
        return;
      }
      const url = enlaceCompartido(window.location.origin, respuesta.token);
      setEnlace(url);
      if (navigator.share) {
        try {
          await navigator.share({ title: "Mi viaje en UniGo", text: "Sigue mi viaje a la U en vivo:", url });
          return;
        } catch (fallo) {
          // Si la persona cerró el menú, no pasa nada.
          if (fallo instanceof DOMException && fallo.name === "AbortError") return;
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        setAviso({ tipo: "listo", texto: "Enlace copiado. Pégalo en un chat con alguien de confianza." });
      } catch {
        setAviso({ tipo: "listo", texto: "Copia el enlace de abajo y envíalo a alguien de confianza." });
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={compartir}
        disabled={pendiente}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-texto-suave/30 font-titulo font-semibold text-texto hover:bg-superficie disabled:opacity-70"
      >
        <IconoCompartir className="size-5 text-secundario" />
        {pendiente ? "Creando enlace…" : "Compartir viaje"}
      </button>
      {aviso && (
        <p role={aviso.tipo === "error" ? "alert" : "status"} className={`text-center text-[13px] ${aviso.tipo === "error" ? "text-error" : "text-texto-suave"}`}>
          {aviso.texto}
        </p>
      )}
      {enlace && aviso?.tipo === "listo" && (
        <div>
          <label htmlFor={idEnlace} className="sr-only">
            Enlace del viaje
          </label>
          <input
            id={idEnlace}
            readOnly
            value={enlace}
            onFocus={(e) => e.currentTarget.select()}
            className="h-11 w-full rounded-xl border border-superficie bg-superficie px-3 text-xs text-texto-suave outline-none focus:border-secundario"
          />
        </div>
      )}
    </div>
  );
}
