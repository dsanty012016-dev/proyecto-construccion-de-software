// Pruebas de la mancha con la que un modo invade la pantalla (invasion.ts).
import { describe, expect, it } from "vitest";
import { alcance, crearTentaculos, ETAPAS, etapasDeInvasion, poligono, PUNTOS_POR_TENTACULO, puntosDeMancha, TENTACULOS } from "./invasion";

// Azar de mentiras: siempre da la misma lista de números.
function azarFijo(valores: number[]) {
  let i = 0;
  return () => valores[i++ % valores.length];
}

const centro = { x: 340, y: 30 };
const ANCHO = 390;
const ALTO = 844;

describe("alcance", () => {
  it("mide hasta la esquina más lejana", () => {
    expect(alcance({ x: 0, y: 0 }, 300, 400)).toBe(500);
    expect(alcance({ x: 300, y: 400 }, 300, 400)).toBe(500);
    expect(alcance({ x: 150, y: 200 }, 300, 400)).toBe(250);
  });
});

describe("tentáculos", () => {
  it("crea los que le piden, repartidos en la vuelta completa", () => {
    const tentaculos = crearTentaculos(TENTACULOS, azarFijo([0.5]));
    expect(tentaculos).toHaveLength(TENTACULOS);
    expect(tentaculos[0].angulo).toBe(0);
    expect(tentaculos[TENTACULOS - 1].angulo).toBeLessThan(2 * Math.PI);
  });

  it("con el mismo azar da los mismos tentáculos", () => {
    expect(crearTentaculos(5, azarFijo([0.1, 0.7, 0.3]))).toEqual(crearTentaculos(5, azarFijo([0.1, 0.7, 0.3])));
  });
});

describe("mancha", () => {
  const tentaculos = crearTentaculos(TENTACULOS, azarFijo([0.2, 0.9, 0.4, 0.6]));

  it("da la misma cantidad de puntos en todas las etapas", () => {
    for (const etapa of ETAPAS) {
      expect(puntosDeMancha(centro, tentaculos, etapa.cuerpo * 100, etapa.punta * 100, etapa.giro)).toHaveLength(TENTACULOS * PUNTOS_POR_TENTACULO);
    }
  });

  it("empieza recogida en el botón", () => {
    for (const punto of puntosDeMancha(centro, tentaculos, 0, 0, 0)) expect(punto).toEqual(centro);
  });

  it("las puntas van adelante del cuerpo", () => {
    const puntos = puntosDeMancha(centro, tentaculos, 100, 300, 1);
    const lejos = (p: { x: number; y: number }) => Math.hypot(p.x - centro.x, p.y - centro.y);
    for (let i = 0; i < puntos.length; i += PUNTOS_POR_TENTACULO) {
      const [hombro, codo, laPunta, otroCodo, otroHombro] = puntos.slice(i, i + PUNTOS_POR_TENTACULO).map(lejos);
      expect(hombro).toBeCloseTo(100, 0);
      expect(otroHombro).toBeCloseTo(100, 0);
      expect(codo).toBeGreaterThan(100);
      expect(otroCodo).toBeCloseTo(codo, 0);
      expect(laPunta).toBeGreaterThan(codo);
    }
  });

  it("al final tapa la pantalla entera", () => {
    const distancia = alcance(centro, ANCHO, ALTO);
    const ultima = ETAPAS[ETAPAS.length - 1];
    const puntos = puntosDeMancha(centro, tentaculos, ultima.cuerpo * distancia, ultima.punta * distancia, ultima.giro);
    // El punto más cercano del borde está en la mitad de un lado del polígono.
    let masCerca = Infinity;
    for (let i = 0; i < puntos.length; i++) {
      const a = puntos[i];
      const b = puntos[(i + 1) % puntos.length];
      masCerca = Math.min(masCerca, Math.hypot((a.x + b.x) / 2 - centro.x, (a.y + b.y) / 2 - centro.y));
    }
    expect(masCerca).toBeGreaterThan(distancia);
  });

  it("escribe el polígono en pixeles", () => {
    expect(poligono([{ x: 1, y: 2.5 }, { x: 30, y: 4 }])).toBe("polygon(1px 2.5px, 30px 4px)");
  });
});

describe("etapasDeInvasion", () => {
  it("devuelve una etapa por momento, de 0 a 1, con la misma cantidad de puntos", () => {
    const etapas = etapasDeInvasion(centro, ANCHO, ALTO, azarFijo([0.3, 0.8, 0.5]));
    expect(etapas.map((e) => e.momento)).toEqual(ETAPAS.map((e) => e.momento));
    expect(etapas[0].momento).toBe(0);
    expect(etapas[etapas.length - 1].momento).toBe(1);
    for (const etapa of etapas) expect(etapa.poligono.split(",")).toHaveLength(TENTACULOS * PUNTOS_POR_TENTACULO);
  });
});
