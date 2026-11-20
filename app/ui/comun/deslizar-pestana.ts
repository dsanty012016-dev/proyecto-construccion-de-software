const MOVIL_TACTIL = "(max-width: 59.99rem) and (pointer: coarse)";
const BORDE_DEL_SISTEMA = 24;
const CONTROLES = "form, a, button, input, textarea, select, label, summary, [role=button], [role=slider], [contenteditable]:not([contenteditable=false])";
const ZONAS_TACTILES = "dialog, .maplibregl-map, [aria-modal=true]";

function admiteGesto(destino: EventTarget | null, contenido: HTMLElement) {
  if (!(destino instanceof Element) || destino.closest(`${CONTROLES}, ${ZONAS_TACTILES}`)) return false;
  // Las tablas y otras regiones con desplazamiento lateral usan su propio gesto.
  for (let elemento: Element | null = destino; elemento && elemento !== contenido; elemento = elemento.parentElement) {
    if (elemento.scrollWidth > elemento.clientWidth + 1 && /^(auto|scroll)$/.test(getComputedStyle(elemento).overflowX)) return false;
  }
  return true;
}

export function escucharDeslizamiento(contenido: HTMLElement, navegar: (hacia: "anterior" | "siguiente") => void) {
  const movil = window.matchMedia(MOVIL_TACTIL);
  let inicio: { id: number; x: number; y: number; scroll: number } | null = null;

  function comenzar(evento: TouchEvent) {
    inicio = null;
    if (!movil.matches || evento.touches.length !== 1 || (window.visualViewport?.scale ?? 1) > 1) return;
    if (!admiteGesto(evento.target, contenido) || document.activeElement?.matches("input, textarea, select, [contenteditable=true]")) return;
    const dedo = evento.touches[0];
    if (dedo.clientX < BORDE_DEL_SISTEMA || dedo.clientX > window.innerWidth - BORDE_DEL_SISTEMA) return;
    inicio = { id: dedo.identifier, x: dedo.clientX, y: dedo.clientY, scroll: window.scrollY };
  }

  function seguir(evento: TouchEvent) {
    if (!inicio) return;
    const dedo = evento.touches[0];
    if (evento.touches.length !== 1 || dedo.identifier !== inicio.id ||
        Math.abs(dedo.clientY - inicio.y) > Math.max(24, Math.abs(dedo.clientX - inicio.x))) {
      inicio = null;
    }
  }

  function terminar(evento: TouchEvent) {
    const gesto = inicio;
    inicio = null;
    if (!gesto || evento.touches.length !== 0 || Math.abs(window.scrollY - gesto.scroll) > 8 ||
        window.getSelection()?.isCollapsed === false) return;
    const dedo = Array.from(evento.changedTouches).find(t => t.identifier === gesto.id);
    if (!dedo) return;
    const x = dedo.clientX - gesto.x;
    const y = dedo.clientY - gesto.y;
    if (Math.abs(x) < Math.max(64, window.innerWidth * .16) || Math.abs(y) > Math.abs(x) * .5) return;
    navegar(x < 0 ? "siguiente" : "anterior");
  }

  function cancelar() { inicio = null; }

  contenido.addEventListener("touchstart", comenzar, { passive: true });
  contenido.addEventListener("touchmove", seguir, { passive: true });
  contenido.addEventListener("touchend", terminar, { passive: true });
  contenido.addEventListener("touchcancel", cancelar, { passive: true });
  return () => {
    contenido.removeEventListener("touchstart", comenzar);
    contenido.removeEventListener("touchmove", seguir);
    contenido.removeEventListener("touchend", terminar);
    contenido.removeEventListener("touchcancel", cancelar);
  };
}
