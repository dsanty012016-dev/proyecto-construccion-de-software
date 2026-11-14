// La forma con la que un modo "invade" la pantalla al cambiar de claro a
// oscuro (o al revés): una mancha con tentáculos que sale del botón y crece
// hasta taparlo todo. Aquí solo está la geometría, como funciones puras: el
// azar entra por parámetro y se prueba en invasion.test.ts. La animación la
// hace app/ui/comun/tema-navegador.ts con estas etapas.

export interface Punto {
  x: number;
  y: number;
}

/** Un tentáculo de la mancha: hacia dónde sale y dos números al azar entre 0 y 1. */
export interface Tentaculo {
  /** Ángulo en radianes. */
  angulo: number;
  /** Qué tan largo es frente a los demás. */
  largo: number;
  /** Hacia qué lado se tuerce (0 a un lado, 1 al otro). */
  giro: number;
}

/** Cuántos tentáculos tiene la mancha. */
export const TENTACULOS = 12;

/** Cuánto dura la invasión, en milisegundos. */
export const DURACION_INVASION = 900;

/** Curvas de la animación: salir disparado y frenar, o arrancar suave y frenar. */
const DISPARO = "cubic-bezier(0.23, 1, 0.32, 1)";
const OLA = "cubic-bezier(0.77, 0, 0.175, 1)";

/**
 * Las cuatro etapas de la mancha: en qué momento va cada una (0 a 1), hasta
 * dónde llega el cuerpo y hasta dónde las puntas (como fracción de la
 * distancia a la esquina más lejana), hacia dónde se tuercen los tentáculos
 * y con qué curva se pasa a la etapa siguiente. Primero salen disparados los
 * tentáculos, luego el cuerpo los alcanza como una ola y al final tapa todo:
 * por eso la última etapa pasa de 1.
 */
export const ETAPAS = [
  { momento: 0, cuerpo: 0, punta: 0, giro: 0, curva: DISPARO },
  { momento: 0.24, cuerpo: 0.08, punta: 0.55, giro: 1, curva: OLA },
  { momento: 0.7, cuerpo: 0.6, punta: 1.05, giro: -0.7, curva: DISPARO },
  { momento: 1, cuerpo: 1.12, punta: 1.5, giro: 0, curva: DISPARO },
] as const;

/** Cuántos puntos dibujan cada tentáculo: hombro, codo, punta, codo y hombro. */
export const PUNTOS_POR_TENTACULO = 5;

/** Distancia del punto a la esquina de la pantalla que le queda más lejos. */
export function alcance(centro: Punto, ancho: number, alto: number): number {
  return Math.hypot(Math.max(centro.x, ancho - centro.x), Math.max(centro.y, alto - centro.y));
}

/** Reparte los tentáculos alrededor del centro, cada uno un poco corrido y con su largo. */
export function crearTentaculos(cantidad: number, azar: () => number): Tentaculo[] {
  const paso = (2 * Math.PI) / cantidad;
  return Array.from({ length: cantidad }, (_, i) => ({
    angulo: paso * (i + (azar() - 0.5) * 0.5),
    largo: azar(),
    giro: azar(),
  }));
}

/**
 * Los puntos de la mancha en una etapa. Cada tentáculo sale del cuerpo por
 * dos hombros, se angosta en dos codos y termina en la punta; los codos y la
 * punta se corren hacia un lado para que se vea torcido. Siempre devuelve la
 * misma cantidad de puntos para que el navegador pueda pasar de una etapa a
 * la otra.
 */
export function puntosDeMancha(centro: Punto, tentaculos: Tentaculo[], cuerpo: number, punta: number, giro: number): Punto[] {
  const paso = (2 * Math.PI) / tentaculos.length;
  const ancho = paso * 0.34;
  const en = (angulo: number, radio: number): Punto => ({
    x: redondear(centro.x + Math.cos(angulo) * radio),
    y: redondear(centro.y + Math.sin(angulo) * radio),
  });
  return tentaculos.flatMap((t) => {
    // Con giro positivo los largos van al derecho; con negativo, al revés:
    // así los tentáculos cortos de una etapa son los largos de la siguiente.
    const largo = giro < 0 ? 1 - t.largo : t.largo;
    const radioPunta = cuerpo + (punta - cuerpo) * (0.35 + 0.65 * largo);
    const radioCodo = cuerpo + (radioPunta - cuerpo) * 0.55;
    const torcido = (t.giro - 0.5) * paso * 2.2 * giro;
    return [
      en(t.angulo - ancho, cuerpo),
      en(t.angulo + torcido * 0.45 - ancho * 0.4, radioCodo),
      en(t.angulo + torcido, radioPunta),
      en(t.angulo + torcido * 0.45 + ancho * 0.4, radioCodo),
      en(t.angulo + ancho, cuerpo),
    ];
  });
}

/** Los puntos como `polygon(...)` de CSS, en pixeles. */
export function poligono(puntos: Punto[]): string {
  return `polygon(${puntos.map((p) => `${p.x}px ${p.y}px`).join(", ")})`;
}

/**
 * Las etapas de la invasión listas para animar: el polígono de cada una y su
 * momento. `centro` es de dónde sale (el botón) y `ancho` y `alto`, la pantalla.
 */
export function etapasDeInvasion(centro: Punto, ancho: number, alto: number, azar: () => number): { momento: number; poligono: string; curva: string }[] {
  const distancia = alcance(centro, ancho, alto);
  const tentaculos = crearTentaculos(TENTACULOS, azar);
  return ETAPAS.map((etapa) => ({
    momento: etapa.momento,
    curva: etapa.curva,
    poligono: poligono(puntosDeMancha(centro, tentaculos, etapa.cuerpo * distancia, etapa.punta * distancia, etapa.giro)),
  }));
}

function redondear(valor: number): number {
  return Math.round(valor * 10) / 10;
}
