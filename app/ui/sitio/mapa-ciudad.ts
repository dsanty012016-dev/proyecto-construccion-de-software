// Ciudad de mentira para la portada: manzanas, edificios, la ruta del
// estudiante y la universidad. La comparten el mapa SVG (respaldo) y la escena
// 3D de A-Frame, para que las dos muestren exactamente lo mismo.
// Unidades: metros "de maqueta". x crece a la derecha y z hacia quien mira.

export interface Edificio {
  x: number;
  z: number;
  ancho: number;
  fondo: number;
  alto: number;
}

export interface PuntoRuta {
  x: number;
  z: number;
}

const PASO = 3; // distancia entre centros de manzana (manzana + calle)
const MANZANA = 2.3;
const RADIO = 3; // manzanas a cada lado del centro: 7 x 7

/** Manzana donde está la universidad (en índices de la cuadrícula). */
const CAMPUS = { i: 2, j: -2 };

/** Límite del mapa, útil para el viewBox del SVG. */
export const MEDIDA_MAPA = (RADIO + 0.5) * PASO;

// Generador pseudoaleatorio con semilla: el mapa sale igual en cada visita y
// igual en el servidor y en el navegador.
function aleatorio(semilla: number) {
  let a = semilla;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function redondear(n: number) {
  return Math.round(n * 100) / 100;
}

function crearEdificios(): Edificio[] {
  const azar = aleatorio(20261020);
  const lista: Edificio[] = [];
  const lote = (MANZANA - 0.2) / 2;

  for (let i = -RADIO; i <= RADIO; i++) {
    for (let j = -RADIO; j <= RADIO; j++) {
      if (i === CAMPUS.i && j === CAMPUS.j) continue;
      // Cada manzana tiene 4 lotes; algunos quedan vacíos (parques).
      for (const [di, dj] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ]) {
        if (azar() < 0.14) continue;
        const cercania = 1 - Math.hypot(i, j) / (RADIO * 1.5);
        lista.push({
          x: redondear(i * PASO + (di * (lote + 0.2)) / 2),
          z: redondear(j * PASO + (dj * (lote + 0.2)) / 2),
          ancho: redondear(lote * (0.8 + azar() * 0.2)),
          fondo: redondear(lote * (0.8 + azar() * 0.2)),
          // Más altos hacia el centro, como un centro de ciudad.
          alto: redondear(0.25 + azar() * 1.1 + Math.max(0, cercania) * 1.2),
        });
      }
    }
  }
  return lista;
}

export const EDIFICIOS: readonly Edificio[] = crearEdificios();

/** La universidad: un edificio ancho y una torre, en su propia manzana. */
export const UNIVERSIDAD = {
  x: CAMPUS.i * PASO,
  z: CAMPUS.j * PASO,
  edificios: [
    { x: CAMPUS.i * PASO - 0.35, z: CAMPUS.j * PASO + 0.35, ancho: 1.5, fondo: 1.4, alto: 1.1 },
    { x: CAMPUS.i * PASO + 0.6, z: CAMPUS.j * PASO - 0.55, ancho: 0.9, fondo: 0.9, alto: 2.6 },
  ] satisfies Edificio[],
};

/** Recorrido por las calles, desde la casa del estudiante hasta el campus. */
export const RUTA: readonly PuntoRuta[] = [
  { x: -4.5, z: 4.5 },
  { x: -4.5, z: 1.5 },
  { x: 1.5, z: 1.5 },
  { x: 1.5, z: -4.5 },
  { x: 4.5, z: -4.5 },
];

/** Calles: las líneas entre manzanas, en x y en z. */
export const CALLES: readonly number[] = Array.from(
  { length: RADIO * 2 + 2 },
  (_, k) => (k - RADIO - 0.5) * PASO,
);

export const LARGO_CALLE = (RADIO + 0.5) * PASO * 2;
export const TAMANO_MANZANA = MANZANA;
export const PASO_MANZANA = PASO;
export const RADIO_MAPA = RADIO;
