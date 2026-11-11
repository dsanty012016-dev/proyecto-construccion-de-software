// Modo claro y modo oscuro: las reglas puras (sin navegador), para probarlas.
// Los colores de cada modo están en app/globals.css; el botón, en
// app/ui/comun/boton-tema.tsx.

export const TEMAS = ["claro", "oscuro"] as const;
export type Tema = (typeof TEMAS)[number];

/** Nombre con el que se guarda la elección en el navegador (localStorage). */
export const CLAVE_TEMA = "unigo-tema";

/** Aviso que se lanza en la ventana al cambiar de modo (el mapa y el 3D se repintan). */
export const EVENTO_TEMA = "unigo-tema";

/** Color de la barra del navegador en cada modo: el del fondo (globals.css). */
export const COLOR_BARRA: Record<Tema, string> = { claro: "#f4f7fb", oscuro: "#0b1220" };

/** ¿Es un modo válido? Lo guardado lo puede cambiar cualquiera desde el navegador. */
export function esTema(valor: unknown): valor is Tema {
  return valor === "claro" || valor === "oscuro";
}

/**
 * El modo que se ve: el que la persona eligió; si no ha elegido (o lo guardado
 * no sirve), el del celular.
 */
export function temaEfectivo(guardado: unknown, celularEnClaro: boolean): Tema {
  if (esTema(guardado)) return guardado;
  return celularEnClaro ? "claro" : "oscuro";
}

/** El modo contrario: lo que pone el botón al tocarlo. */
export function otroTema(tema: Tema): Tema {
  return tema === "claro" ? "oscuro" : "claro";
}

/**
 * Código que corre antes de pintar la página (app/layout.tsx): pone en <html>
 * el modo guardado para que no se vea un parpadeo del otro modo. Va como
 * texto porque tiene que ejecutarse antes que React.
 */
export const SCRIPT_TEMA = `try{var t=localStorage.getItem(${JSON.stringify(CLAVE_TEMA)});if(t==="claro"||t==="oscuro")document.documentElement.dataset.tema=t}catch(e){}`;
