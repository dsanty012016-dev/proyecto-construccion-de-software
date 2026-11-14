// Modo claro y oscuro en el navegador: leerlo, cambiarlo y enterarse de los
// cambios. Las reglas puras están en app/lib/tema.ts.
import { DURACION_INVASION, etapasDeInvasion } from "@/app/lib/invasion";
import { CLAVE_TEMA, COLOR_BARRA, EVENTO_TEMA, esTema, otroTema, temaEfectivo, type Tema } from "@/app/lib/tema";

const CELULAR_EN_CLARO = "(prefers-color-scheme: light)";

/** El modo que se está viendo ahora. */
export function temaActual(): Tema {
  return temaEfectivo(document.documentElement.dataset.tema, window.matchMedia(CELULAR_EN_CLARO).matches);
}

/** Pasa al otro modo, lo guarda en este navegador y avisa al mapa y al 3D. */
export function cambiarTema(): Tema {
  const tema = otroTema(temaActual());
  document.documentElement.dataset.tema = tema;
  try {
    localStorage.setItem(CLAVE_TEMA, tema);
  } catch {
    // Navegación privada o guardado bloqueado: el modo dura hasta cerrar la página.
  }
  // La barra del navegador toma el color del fondo.
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.setAttribute("content", COLOR_BARRA[tema]);
  window.dispatchEvent(new Event(EVENTO_TEMA));
  return tema;
}

// El navegador toma una foto de la página antes y otra después del cambio
// (View Transitions); no todos lo saben hacer, por eso se pregunta primero.
type DocumentoConTransicion = { startViewTransition?: (cambiar: () => void) => { ready: Promise<void>; finished: Promise<void> } };

/** Cuántas invasiones se han lanzado: solo la última quita la clase al terminar. */
let invasiones = 0;

/**
 * Cambia de modo con la invasión: el modo nuevo sale del botón como una
 * mancha con tentáculos y tapa la pantalla (la forma está en lib/invasion.ts).
 * Si la persona pidió menos movimiento, o el navegador no sabe hacerlo, el
 * cambio es inmediato, como antes.
 */
export function cambiarTemaInvadiendo(boton: Element): void {
  const documento = document as unknown as DocumentoConTransicion;
  if (!documento.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    cambiarTema();
    return;
  }
  const caja = boton.getBoundingClientRect();
  const centro = { x: caja.left + caja.width / 2, y: caja.top + caja.height / 2 };
  const etapas = etapasDeInvasion(centro, window.innerWidth, window.innerHeight, Math.random);
  const raiz = document.documentElement;
  const esta = ++invasiones;
  // La clase apaga el fundido normal del navegador (globals.css).
  raiz.classList.add("tema-invade");
  const transicion = documento.startViewTransition.call(document, () => {
    cambiarTema();
  });
  transicion.ready
    .then(() => {
      raiz.animate(
        etapas.map((etapa) => ({ clipPath: etapa.poligono, offset: etapa.momento, easing: etapa.curva })),
        { duration: DURACION_INVASION, pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => {
      // La transición se saltó (por ejemplo, otro clic encima): el modo ya cambió.
    });
  transicion.finished
    .catch(() => {})
    .then(() => {
      if (esta === invasiones) raiz.classList.remove("tema-invade");
    });
}

/**
 * Llama a `alCambiar` cuando cambia el modo: por el botón, por el celular
 * (si la persona no ha elegido) o desde otra pestaña. Devuelve cómo dejar de escuchar.
 */
export function escucharTema(alCambiar: () => void): () => void {
  const celular = window.matchMedia(CELULAR_EN_CLARO);
  const otraPestana = (evento: StorageEvent) => {
    if (evento.key !== CLAVE_TEMA) return;
    if (esTema(evento.newValue)) document.documentElement.dataset.tema = evento.newValue;
    alCambiar();
  };
  window.addEventListener(EVENTO_TEMA, alCambiar);
  celular.addEventListener("change", alCambiar);
  window.addEventListener("storage", otraPestana);
  return () => {
    window.removeEventListener(EVENTO_TEMA, alCambiar);
    celular.removeEventListener("change", alCambiar);
    window.removeEventListener("storage", otraPestana);
  };
}
