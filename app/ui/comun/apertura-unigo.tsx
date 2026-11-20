"use client";

import { useEffect, useRef } from "react";
import { Logo } from "./logo";

const CLAVE = "unigo:apertura-vista";
const OMITIR = /^\/(?:privacidad|compartido|sin-conexion)(?:\/|$)/;

export function AperturaUniGo() {
  const panel = useRef<HTMLDivElement>(null);
  const reproducir = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    const elemento = panel.current;
    const movimiento = window.matchMedia("(prefers-reduced-motion: no-preference)");
    if (!elemento || !movimiento.matches || OMITIR.test(window.location.pathname)) return;
    if (document.visibilityState !== "visible" || document.activeElement !== document.body) return;

    if (reproducir.current === undefined) {
      try {
        reproducir.current = sessionStorage.getItem(CLAVE) !== "1";
        sessionStorage.setItem(CLAVE, "1");
      } catch {
        reproducir.current = true;
      }
    }
    if (!reproducir.current) return;

    elemento.dataset.activa = "";
    function cerrar() {
      if (elemento) {
        delete elemento.dataset.activa;
        elemento.removeEventListener("animationend", alTerminar);
      }
      document.removeEventListener("pointerdown", cerrar, true);
      document.removeEventListener("keydown", cerrar, true);
      document.removeEventListener("visibilitychange", cerrar);
      movimiento.removeEventListener("change", cerrar);
      window.clearTimeout(respaldo);
    }
    function alTerminar(evento: AnimationEvent) {
      if (evento.target === elemento) cerrar();
    }
    const respaldo = window.setTimeout(cerrar, 1100);
    document.addEventListener("pointerdown", cerrar, true);
    document.addEventListener("keydown", cerrar, true);
    document.addEventListener("visibilitychange", cerrar);
    movimiento.addEventListener("change", cerrar);
    elemento.addEventListener("animationend", alTerminar);
    return cerrar;
  }, []);

  return (
    <div ref={panel} className="producto-tema apertura-unigo" aria-hidden="true">
      <div className="apertura-unigo-marca">
        <div className="apertura-unigo-recorrido">
          <span className="apertura-unigo-tramo" />
          <span className="apertura-unigo-tramo" />
          <span className="apertura-unigo-tramo" />
          <span className="apertura-unigo-parada" />
          <span className="apertura-unigo-parada" />
          <span className="apertura-unigo-parada" />
        </div>
        <div className="apertura-unigo-logo">
          <Logo ancho={192} alto={68} className="h-auto" alt="" />
        </div>
      </div>
    </div>
  );
}
