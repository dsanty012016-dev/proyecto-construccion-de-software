// Modo claro y oscuro en el navegador: leerlo, cambiarlo y enterarse de los
// cambios. Las reglas puras están en app/lib/tema.ts.
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
