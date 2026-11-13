"use client";

// Vuelve a intentar cargar la página (en la pantalla "sin conexión").
export function BotonReintentar() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="flex h-12 w-full items-center justify-center rounded-xl bg-primario prensa font-titulo font-semibold text-sobre-primario transition-colors hover:bg-primario/85"
    >
      Reintentar
    </button>
  );
}
