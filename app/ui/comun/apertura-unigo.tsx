"use client";

import { useEffect, useRef } from "react";
import { Logo } from "./logo";

const CLAVE = "unigo:apertura-vista";
const OMITIR = /^\/(?:privacidad|compartido|sin-conexion)(?:\/|$)/;
const MOSTRAR_APERTURA = "unigo:mostrar-apertura";

export function ControlAperturaUniGo() {
  return (
    <div>
      <button type="button" className="control-apertura-accion inline-flex min-h-11 items-center text-sm font-semibold text-secundario underline underline-offset-4"
        onClick={() => window.dispatchEvent(new Event(MOSTRAR_APERTURA))}>
        Ver animación de apertura
      </button>
      <p className="control-apertura-reducida text-sm text-texto-suave">Tu dispositivo tiene activado Reducir movimiento.</p>
    </div>
  );
}

export function AperturaUniGo() {
  const panel = useRef<HTMLDivElement>(null);
  const reproducir = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    const elemento = panel.current;
    const movimiento = window.matchMedia("(prefers-reduced-motion: no-preference)");
    if (!elemento) return;
    let respaldo: number | undefined;
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
    function abrir() {
      if (!elemento || !movimiento.matches || document.visibilityState !== "visible" || "activa" in elemento.dataset) return;
      elemento.dataset.activa = "";
      respaldo = window.setTimeout(cerrar, 1600);
      document.addEventListener("pointerdown", cerrar, true);
      document.addEventListener("keydown", cerrar, true);
      document.addEventListener("visibilitychange", cerrar);
      movimiento.addEventListener("change", cerrar);
      elemento.addEventListener("animationend", alTerminar);
    }

    window.addEventListener(MOSTRAR_APERTURA, abrir);
    if (movimiento.matches && !OMITIR.test(window.location.pathname) &&
        document.visibilityState === "visible" && document.activeElement === document.body) {
      if (reproducir.current === undefined) {
        try {
          reproducir.current = sessionStorage.getItem(CLAVE) !== "1";
          sessionStorage.setItem(CLAVE, "1");
        } catch {
          reproducir.current = true;
        }
      }
      if (reproducir.current) abrir();
    }
    return () => {
      cerrar();
      window.removeEventListener(MOSTRAR_APERTURA, abrir);
    };
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
          <span className="apertura-unigo-vehiculo" />
        </div>
        <div className="apertura-unigo-logo">
          <Logo ancho={192} alto={68} className="h-auto" alt="" />
        </div>
      </div>
    </div>
  );
}
