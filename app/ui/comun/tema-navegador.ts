// Modo claro y oscuro en el navegador: leerlo, cambiarlo y enterarse de los
// cambios. Las reglas puras están en app/lib/tema.ts.
import { CLAVE_TEMA, COLOR_BARRA, EVENTO_TEMA, esTema, otroTema, temaEfectivo, type Tema } from "@/app/lib/tema";

const CELULAR_EN_CLARO = "(prefers-color-scheme: light)";
const MOVIMIENTO_REDUCIDO = "(prefers-reduced-motion: reduce)";
const REFLEJO_LIGERO = "tema-reflejo-ligero";

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

/** Barre una sola franja sin capturar la pantalla. */
function mostrarReflejoLigero(cambiar?: () => void): void {
  const raiz = document.documentElement;
  raiz.classList.add(REFLEJO_LIGERO);
  if (cambiar) window.setTimeout(cambiar, 190);
  window.setTimeout(() => raiz.classList.remove(REFLEJO_LIGERO), 540);
}

/** En Android muestra el reflejo con una sola capa para mantenerlo ligero. */
export function cambiarTemaConReflejo(): void {
  const raiz = document.documentElement;
  const reducido = window.matchMedia(MOVIMIENTO_REDUCIDO);
  if (raiz.classList.contains("tema-reflejo") || raiz.classList.contains(REFLEJO_LIGERO)) return;
  if (reducido.matches) {
    cambiarTema();
    return;
  }
  if (!document.startViewTransition || /\bAndroid\b/i.test(navigator.userAgent)) {
    mostrarReflejoLigero(cambiarTema);
    return;
  }
  raiz.classList.add("tema-reflejo");
  try {
    const transicion = document.startViewTransition(() => { cambiarTema(); });
    void transicion.ready.catch(() => {
      // El navegador ya ejecuta el cambio aunque omita la transición.
      if (!reducido.matches && document.visibilityState === "visible") mostrarReflejoLigero();
    });
    void transicion.finished.catch(() => {}).then(() => raiz.classList.remove("tema-reflejo"));
  } catch {
    raiz.classList.remove("tema-reflejo");
    mostrarReflejoLigero(cambiarTema);
  }
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
