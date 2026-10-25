// Clases que se repiten en las secciones de la landing, para que todas hablen
// igual (mismos títulos, mismos botones).

export const TITULO_SECCION = "text-[clamp(2.25rem,5vw,4rem)] leading-[1.02] font-extrabold tracking-[-0.035em] text-balance";

export const BOTON_PRINCIPAL =
  "inline-flex min-h-14 items-center justify-center rounded-full bg-primario px-7 font-titulo text-[17px] font-semibold text-texto transition-colors hover:bg-primario/85";

export const BOTON_BORDE =
  "inline-flex min-h-14 items-center justify-center rounded-full border border-texto-suave/35 px-6 font-semibold text-texto transition-colors hover:border-texto-suave";

/** Ancho y márgenes de cada sección. */
export const SECCION = "mx-auto max-w-[1200px] px-5";

/** Espacio arriba de cada sección (el ritmo de la página). */
export const AIRE = "pt-[clamp(5.5rem,10vw,9rem)]";
