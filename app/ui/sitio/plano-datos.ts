import type { Coordenada } from "@/app/lib/mapa";

// Datos del plano de la portada. Los barrios salen de OpenStreetMap (Nominatim)
// y cada ruta hasta la universidad, de FOSSGIS OSRM: se consultaron una vez
// (noviembre de 2026) y se guardan aquí para no pedirle una ruta al servicio
// en cada visita a la portada. Las rutas son reales; los nombres, horas y
// precios que las acompañan en la portada son de ejemplo.

/** Universidad Santo Tomás, sede de Villavicencio (la misma de 007-ubicacion-sede.sql). */
export const SEDE: Coordenada = { lat: 4.121686325903587, lng: -73.61549558142269 };

export interface BarrioPortada {
  nombre: string;
  /** Centro del barrio según OpenStreetMap. */
  punto: Coordenada;
  /** Distancia de la ruta por las vías, en km. */
  km: number;
  /** Ruta por las vías hasta la U, puntos [lng, lat]. */
  ruta: [number, number][];
}

export const BARRIOS: BarrioPortada[] = [
  {
    nombre: "Barzal",
    punto: { lat: 4.14558, lng: -73.63938 },
    km: 5.5,
    ruta: [[-73.63928,4.14572],[-73.63905,4.14549],[-73.64,4.14512],[-73.64023,4.14579],[-73.63954,4.14612],[-73.63791,4.14828],[-73.6373,4.14874],[-73.63653,4.14706],[-73.63516,4.14524],[-73.63384,4.1437],[-73.63122,4.14029],[-73.62798,4.13591],[-73.6263,4.1338],[-73.61686,4.12139],[-73.61608,4.12067],[-73.61585,4.12],[-73.615496,4.121686]],
  },
  {
    nombre: "Centro",
    punto: { lat: 4.15155, lng: -73.63831 },
    km: 6.3,
    ruta: [[-73.63793,4.15175],[-73.63892,4.15352],[-73.63788,4.15412],[-73.63759,4.15437],[-73.63722,4.15473],[-73.63665,4.15561],[-73.63453,4.15335],[-73.63434,4.15297],[-73.63429,4.15254],[-73.63542,4.14776],[-73.63602,4.14717],[-73.63644,4.14694],[-73.63516,4.14524],[-73.63384,4.1437],[-73.63122,4.14029],[-73.62798,4.13591],[-73.6263,4.1338],[-73.61686,4.12139],[-73.61608,4.12067],[-73.61585,4.12],[-73.615496,4.121686]],
  },
  {
    nombre: "El Buque",
    punto: { lat: 4.1379, lng: -73.64348 },
    km: 4.9,
    ruta: [[-73.64339,4.13787],[-73.64393,4.13626],[-73.62927,4.13133],[-73.6286,4.13123],[-73.62755,4.13131],[-73.62686,4.13151],[-73.62567,4.13225],[-73.62551,4.13227],[-73.62519,4.13217],[-73.6244,4.13117],[-73.62421,4.13104],[-73.61686,4.12139],[-73.61608,4.12067],[-73.61585,4.12],[-73.615496,4.121686]],
  },
  {
    nombre: "La Esperanza",
    punto: { lat: 4.12854, lng: -73.63494 },
    km: 4,
    ruta: [[-73.63502,4.12833],[-73.63225,4.12734],[-73.63173,4.12876],[-73.63134,4.12932],[-73.63044,4.1317],[-73.62916,4.1313],[-73.62797,4.13124],[-73.62686,4.13151],[-73.62567,4.13225],[-73.62526,4.1322],[-73.625,4.13197],[-73.6244,4.13117],[-73.62421,4.13104],[-73.61686,4.12139],[-73.61608,4.12067],[-73.61585,4.12],[-73.615496,4.121686]],
  },
  {
    nombre: "Porfía",
    punto: { lat: 4.07872, lng: -73.67201 },
    km: 10.3,
    ruta: [[-73.67201,4.0789],[-73.66939,4.07888],[-73.66942,4.07847],[-73.66928,4.0786],[-73.6692,4.08659],[-73.66922,4.08671],[-73.67019,4.08819],[-73.67022,4.08838],[-73.67013,4.08862],[-73.66439,4.09314],[-73.6638,4.09371],[-73.66325,4.09438],[-73.66192,4.09647],[-73.66003,4.099],[-73.65955,4.09973],[-73.6575,4.10347],[-73.65731,4.10365],[-73.65701,4.10375],[-73.65688,4.10388],[-73.65683,4.10417],[-73.65618,4.10578],[-73.65583,4.10692],[-73.65554,4.10752],[-73.65412,4.11003],[-73.6525,4.11252],[-73.65159,4.11347],[-73.64609,4.11801],[-73.64584,4.1183],[-73.64516,4.11944],[-73.64476,4.11967],[-73.64371,4.11984],[-73.64259,4.1203],[-73.64222,4.1203],[-73.64104,4.11971],[-73.63878,4.11817],[-73.6341,4.11567],[-73.6328,4.11514],[-73.63224,4.11504],[-73.63172,4.11503],[-73.63049,4.11527],[-73.6189,4.11873],[-73.61698,4.11913],[-73.61661,4.11928],[-73.61581,4.11981],[-73.615496,4.121686]],
  },
  {
    nombre: "Siete de Agosto",
    punto: { lat: 4.14091, lng: -73.63712 },
    km: 5.1,
    ruta: [[-73.63734,4.14083],[-73.63808,4.14297],[-73.63614,4.14365],[-73.63537,4.14422],[-73.63539,4.14434],[-73.6357,4.14478],[-73.63516,4.14524],[-73.63384,4.1437],[-73.63122,4.14029],[-73.62798,4.13591],[-73.6263,4.1338],[-73.61686,4.12139],[-73.61608,4.12067],[-73.61585,4.12],[-73.615496,4.121686]],
  },
  {
    nombre: "Villa Julia",
    punto: { lat: 4.15366, lng: -73.63216 },
    km: 5.6,
    ruta: [[-73.63215,4.15354],[-73.6334,4.15344],[-73.63349,4.15248],[-73.63429,4.15254],[-73.63542,4.14776],[-73.63602,4.14717],[-73.63644,4.14694],[-73.63516,4.14524],[-73.63384,4.1437],[-73.63122,4.14029],[-73.62798,4.13591],[-73.6263,4.1338],[-73.61686,4.12139],[-73.61608,4.12067],[-73.61585,4.12],[-73.615496,4.121686]],
  },
];

/** El barrio de la historia de Laura, el que se ve al abrir la portada. */
export const BARRIO_INICIAL = "Barzal";

/** Salidas de ejemplo de la sección de cupos: hora y barrio de donde salen. */
export const SALIDAS_EJEMPLO = [
  { hora: "6:30", nombre: "Andrés R.", barrio: "La Esperanza", precio: 5000, libres: 2, detalle: "" },
  { hora: "6:45", nombre: "Laura M.", barrio: "El Buque", precio: 4500, libres: 3, detalle: "" },
  { hora: "6:50", nombre: "Sara G.", barrio: "Porfía", precio: 6000, libres: 1, detalle: ", en moto" },
  { hora: "7:10", nombre: "Camilo P.", barrio: "Centro", precio: 5000, libres: 0, detalle: "" },
];

/** Aviso entre el selector de barrio y el plano (los dos viven en partes distintas de la página). */
export const EVENTO_BARRIO = "unigo:barrio-portada";

export function barrioPorNombre(nombre: string): BarrioPortada {
  return BARRIOS.find((b) => b.nombre === nombre) ?? BARRIOS[0];
}

/** Caja [[oeste, sur], [este, norte]] que contiene todos los puntos. Pura, con prueba. */
export function cajaDe(puntos: readonly [number, number][]): [[number, number], [number, number]] {
  let oeste = Infinity, sur = Infinity, este = -Infinity, norte = -Infinity;
  for (const [lng, lat] of puntos) {
    oeste = Math.min(oeste, lng); este = Math.max(este, lng);
    sur = Math.min(sur, lat); norte = Math.max(norte, lat);
  }
  return [[oeste, sur], [este, norte]];
}

/**
 * La parte de la ruta recorrida cuando va en `avance` (0 a 1), medida por la
 * longitud de cada tramo; sirve para dibujar la ruta de a poco. Pura, con prueba.
 */
export function rutaHasta(ruta: readonly [number, number][], avance: number): [number, number][] {
  if (ruta.length < 2 || avance >= 1) return [...ruta];
  const t = Math.max(0, avance);
  const largos = ruta.slice(1).map((p, i) => Math.hypot(p[0] - ruta[i][0], p[1] - ruta[i][1]));
  const total = largos.reduce((a, b) => a + b, 0);
  let falta = total * t;
  const salida: [number, number][] = [ruta[0]];
  for (let i = 0; i < largos.length; i++) {
    if (falta <= 0) break;
    if (falta >= largos[i]) {
      salida.push(ruta[i + 1]);
      falta -= largos[i];
      continue;
    }
    const f = largos[i] === 0 ? 0 : falta / largos[i];
    salida.push([ruta[i][0] + (ruta[i + 1][0] - ruta[i][0]) * f, ruta[i][1] + (ruta[i + 1][1] - ruta[i][1]) * f]);
    break;
  }
  // Una línea necesita al menos dos puntos.
  if (salida.length === 1) salida.push(ruta[0]);
  return salida;
}
