"use client";

import { useEffect, useRef, useState } from "react";
import { EDIFICIOS, RUTA, UNIVERSIDAD, type Edificio } from "./mapa-ciudad";

// Escena 3D de la portada con A-Frame: la misma ciudad del mapa SVG, con un
// carro que recorre la ruta hasta la universidad.
// Reglas (AGENTS.md, punto 8): A-Frame solo en el sitio público, se carga en
// el navegador DESPUÉS del contenido y, si algo falla, queda el mapa SVG.
// No se carga con "menos movimiento", sin WebGL ni con ahorro de datos.

const VERSION_AFRAME = "1.7.0";
const URL_AFRAME = `https://aframe.io/releases/${VERSION_AFRAME}/aframe.min.js`;

// Colores de la identidad (docs/identidad.md). A-Frame no lee clases de
// Tailwind, así que se leen de las variables CSS de app/globals.css.
function color(nombre: string) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--color-${nombre}`)
    .trim();
}

interface AFrameGlobal {
  registerComponent: (nombre: string, definicion: object) => void;
  components: Record<string, unknown>;
}

declare global {
  interface Window {
    AFRAME?: AFrameGlobal;
  }
}

let cargando: Promise<AFrameGlobal> | null = null;

function cargarAFrame(): Promise<AFrameGlobal> {
  if (window.AFRAME) return Promise.resolve(window.AFRAME);
  cargando ??= new Promise((resolver, rechazar) => {
    const script = document.createElement("script");
    script.src = URL_AFRAME;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () =>
      window.AFRAME ? resolver(window.AFRAME) : rechazar(new Error("sin AFRAME"));
    script.onerror = () => {
      cargando = null;
      rechazar(new Error("no cargó A-Frame"));
    };
    document.head.appendChild(script);
  });
  return cargando;
}

function hayWebGL() {
  try {
    const lienzo = document.createElement("canvas");
    return Boolean(lienzo.getContext("webgl2") ?? lienzo.getContext("webgl"));
  } catch {
    return false;
  }
}

function conviene3D() {
  const conexion = (navigator as { connection?: { saveData?: boolean } }).connection;
  return (
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !conexion?.saveData &&
    hayWebGL()
  );
}

/** Mueve una entidad por una lista de puntos "x z; x z; ...", en bucle. */
function registrarRecorrido(AFRAME: AFrameGlobal) {
  if (AFRAME.components.recorrido) return;
  AFRAME.registerComponent("recorrido", {
    schema: {
      puntos: { type: "string" },
      velocidad: { type: "number", default: 1.6 },
      pausa: { type: "number", default: 1.2 },
    },
    init(this: RecorridoThis) {
      this.puntos = this.data.puntos
        .split(";")
        .map((par) => par.trim().split(/\s+/).map(Number) as [number, number]);
      this.tramos = this.puntos.slice(1).map((p, k) => {
        const a = this.puntos[k];
        return Math.hypot(p[0] - a[0], p[1] - a[1]);
      });
      this.total = this.tramos.reduce((s, l) => s + l, 0);
      this.avance = 0;
    },
    tick(this: RecorridoThis, _t: number, dt: number) {
      // Recorre la ruta, se queda un momento en la universidad y vuelve a empezar.
      const ciclo = this.total + this.data.pausa * this.data.velocidad;
      this.avance = (this.avance + (Math.min(dt, 100) / 1000) * this.data.velocidad) % ciclo;
      let d = Math.min(this.avance, this.total);
      for (let k = 0; k < this.tramos.length; k++) {
        if (d <= this.tramos[k] || k === this.tramos.length - 1) {
          const [ax, az] = this.puntos[k];
          const [bx, bz] = this.puntos[k + 1];
          const f = this.tramos[k] === 0 ? 0 : Math.min(1, d / this.tramos[k]);
          this.el.object3D.position.set(ax + (bx - ax) * f, 0.18, az + (bz - az) * f);
          this.el.object3D.rotation.y = Math.atan2(bx - ax, bz - az);
          return;
        }
        d -= this.tramos[k];
      }
    },
  });
}

interface RecorridoThis {
  data: { puntos: string; velocidad: number; pausa: number };
  el: {
    object3D: {
      position: { set: (x: number, y: number, z: number) => void };
      rotation: { y: number };
    };
  };
  puntos: [number, number][];
  tramos: number[];
  total: number;
  avance: number;
}

function caja(e: Edificio, colorRelleno: string, extra = "") {
  return `<a-box position="${e.x} ${e.alto / 2} ${e.z}" width="${e.ancho}" depth="${e.fondo}" height="${e.alto}" color="${colorRelleno}" ${extra}></a-box>`;
}

/** Arma el HTML de la escena con los datos de mapa-ciudad.ts. */
function construirEscena(proporcion: number) {
  const c = {
    fondo: color("fondo"),
    superficie: color("superficie"),
    linea: color("linea"),
    primario: color("primario"),
    secundario: color("secundario"),
    texto: color("texto"),
  };

  const edificios = EDIFICIOS.map((e) => caja(e, c.superficie)).join("");
  const campus = UNIVERSIDAD.edificios
    .map((e) =>
      caja(e, c.primario, `material="emissive: ${c.primario}; emissiveIntensity: 0.35"`),
    )
    .join("");

  // La ruta: una caja delgada y luminosa por cada tramo.
  const tramos = RUTA.slice(1)
    .map((b, k) => {
      const a = RUTA[k];
      const largo = Math.hypot(b.x - a.x, b.z - a.z);
      const giro = (Math.atan2(b.x - a.x, b.z - a.z) * 180) / Math.PI;
      return `<a-box position="${(a.x + b.x) / 2} 0.03 ${(a.z + b.z) / 2}" rotation="0 ${giro} 0" width="0.22" height="0.04" depth="${largo + 0.22}" material="color: ${c.secundario}; emissive: ${c.secundario}; emissiveIntensity: 0.9"></a-box>`;
    })
    .join("");

  // En pantallas verticales (celular) la cámara se aleja para que quepa la ruta.
  const lejos = Math.max(1, 1.2 / proporcion);
  const camara = `0 ${13.5 * lejos} ${15.5 * lejos}`;

  const puntos = RUTA.map((p) => `${p.x} ${p.z}`).join("; ");
  const inicio = RUTA[0];
  const torre = UNIVERSIDAD.edificios[1];

  return `
<a-scene embedded renderer="antialias: true; colorManagement: true; alpha: false"
  vr-mode-ui="enabled: false" loading-screen="enabled: false"
  device-orientation-permission-ui="enabled: false" keyboard-shortcuts="enterVR: false"
  background="color: ${c.fondo}" fog="type: linear; color: ${c.fondo}; near: ${16 * lejos}; far: ${34 * lejos}"
  style="width:100%;height:100%">
  <a-entity light="type: ambient; color: ${c.secundario}; intensity: 0.55"></a-entity>
  <a-entity light="type: directional; color: ${c.texto}; intensity: 0.9" position="-4 8 6"></a-entity>
  <a-entity light="type: point; color: ${c.primario}; intensity: 1.4; distance: 9" position="${UNIVERSIDAD.x} 3.5 ${UNIVERSIDAD.z}"></a-entity>

  <a-entity camera="fov: 42" position="${camara}" rotation="-40 0 0"
    look-controls="enabled: false" wasd-controls="enabled: false"></a-entity>

  <a-entity rotation="0 -18 0"
    animation="property: rotation; from: 0 -24 0; to: 0 -10 0; dir: alternate; loop: true; dur: 14000; easing: easeInOutSine">
    <a-plane rotation="-90 0 0" width="60" height="60" color="${c.fondo}"></a-plane>
    <a-plane rotation="-90 0 0" position="0 0.005 0" width="21" height="21" color="${c.linea}" material="opacity: 0.35"></a-plane>
    ${edificios}
    ${campus}
    <a-cone position="${torre.x} ${torre.alto + 0.55} ${torre.z}" rotation="180 0 0" radius-bottom="0.28" radius-top="0" height="0.6" color="${c.texto}"
      animation="property: position; to: ${torre.x} ${torre.alto + 0.75} ${torre.z}; dir: alternate; loop: true; dur: 1400; easing: easeInOutSine"></a-cone>
    ${tramos}
    <a-cylinder position="${inicio.x} 0.06 ${inicio.z}" radius="0.32" height="0.08" color="${c.secundario}"
      material="emissive: ${c.secundario}; emissiveIntensity: 0.6"></a-cylinder>
    <a-ring rotation="-90 0 0" position="${inicio.x} 0.07 ${inicio.z}" radius-inner="0.42" radius-outer="0.5" color="${c.secundario}"
      animation="property: scale; from: 1 1 1; to: 2.2 2.2 2.2; loop: true; dur: 1800; easing: easeOutQuad"
      animation__opacidad="property: material.opacity; from: 0.9; to: 0; loop: true; dur: 1800; easing: easeOutQuad"></a-ring>
    <a-entity recorrido="puntos: ${puntos}">
      <a-box position="0 0 0" width="0.34" height="0.2" depth="0.6" color="${c.texto}"></a-box>
      <a-box position="0 0.16 -0.04" width="0.3" height="0.14" depth="0.32" color="${c.secundario}"></a-box>
    </a-entity>
  </a-entity>
</a-scene>`;
}

export function EscenaRuta() {
  const contenedor = useRef<HTMLDivElement>(null);
  const [lista, setLista] = useState(false);

  useEffect(() => {
    const nodo = contenedor.current;
    if (!nodo || !conviene3D()) return;
    let cancelado = false;

    // Espera a que la página termine de cargar y el navegador esté libre.
    const empezar = () => {
      cargarAFrame()
        .then((AFRAME) => {
          if (cancelado) return;
          registrarRecorrido(AFRAME);
          nodo.innerHTML = construirEscena(nodo.clientWidth / Math.max(1, nodo.clientHeight));
          const escena = nodo.querySelector("a-scene");
          escena?.addEventListener("loaded", () => !cancelado && setLista(true), {
            once: true,
          });
        })
        .catch(() => {
          // Sin A-Frame se queda el mapa SVG; no hace falta avisar.
        });
    };

    const enEspera =
      "requestIdleCallback" in window
        ? () => window.requestIdleCallback(empezar, { timeout: 2500 })
        : () => window.setTimeout(empezar, 600);

    if (document.readyState === "complete") enEspera();
    else window.addEventListener("load", enEspera, { once: true });

    return () => {
      cancelado = true;
      window.removeEventListener("load", enEspera);
      nodo.innerHTML = "";
    };
  }, []);

  return (
    <div
      ref={contenedor}
      aria-hidden="true"
      className={`absolute inset-0 transition-opacity duration-1000 ${lista ? "opacity-100" : "opacity-0"}`}
    />
  );
}
