"use client";

// Vuelve a intentar cargar la página (en la pantalla "sin conexión").
export function BotonReintentar() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="flex h-12 w-full items-center justify-center rounded-xl bg-primario font-titulo font-semibold text-texto transition-colors hover:bg-primario/85"
    >
      Reintentar
    </button>
  );
}
