// Pruebas del asistente Uni: horas escritas a mano, la decisión de pedir ya o
// buscar cupo, el guion de respaldo y la validación de lo que devuelve la IA.
import { describe, expect, it } from "vitest";
import {
  comentarioDeHora,
  destinosPara,
  extraerHora,
  historialParaIA,
  horaEnColombia,
  instruccionesDelSistema,
  interpretarRespuestaIA,
  minutosHasta,
  respuestaDeGuion,
  sugerirModo,
  textoHora,
} from "./asistente";

// 5:00 a. m. en Colombia = 10:00 UTC
const cincoAM = new Date("2026-11-23T10:00:00Z");
const seisMenosVeinte = new Date("2026-11-23T10:40:00Z");

describe("extraerHora", () => {
  it.each([
    ["tengo que ir a la universidad a las 6", { h: 6, m: 0 }],
    ["entro a las 6:30", { h: 6, m: 30 }],
    ["voy a las seis y media", { h: 6, m: 30 }],
    ["salgo a las 7 pm", { h: 19, m: 0 }],
    ["salgo a las 7pm", { h: 19, m: 0 }],
    ["clase a las 18:00", { h: 18, m: 0 }],
    ["a la una", { h: 13, m: 0 }],
    ["a las 2", { h: 14, m: 0 }],
    ["a las 12", { h: 12, m: 0 }],
    ["a las 6 de la mañana", { h: 6, m: 0 }],
    ["a las 8 de la noche", { h: 20, m: 0 }],
  ])("%s", (texto, hora) => {
    expect(extraerHora(texto)).toEqual(hora);
  });

  it("sin hora devuelve null", () => {
    expect(extraerHora("¿cómo recargo mi saldo?")).toBeNull();
    expect(extraerHora("tengo una pregunta")).toBeNull();
    expect(extraerHora("somos los dos")).toBeNull();
  });
});

describe("la hora en Colombia", () => {
  it("resta 5 horas a UTC", () => {
    expect(horaEnColombia(cincoAM)).toEqual({ h: 5, m: 0 });
    expect(horaEnColombia(new Date("2026-11-23T03:30:00Z"))).toEqual({ h: 22, m: 30 });
  });

  it("cuenta los minutos hasta la próxima vez que sea esa hora", () => {
    expect(minutosHasta({ h: 6, m: 0 }, cincoAM)).toBe(60);
    expect(minutosHasta({ h: 4, m: 0 }, cincoAM)).toBe(23 * 60);
  });

  it("escribe la hora a la colombiana", () => {
    expect(textoHora({ h: 6, m: 0 })).toBe("6:00 a. m.");
    expect(textoHora({ h: 18, m: 5 })).toBe("6:05 p. m.");
    expect(textoHora({ h: 0, m: 0 })).toBe("12:00 a. m.");
  });
});

describe("pedir ya o buscar cupo", () => {
  it("con 45 minutos o menos conviene pedir ya", () => {
    expect(sugerirModo(20)).toBe("pedir_ya");
    expect(sugerirModo(45)).toBe("pedir_ya");
    expect(sugerirModo(46)).toBe("cupo");
  });
});

describe("personalidad", () => {
  it("a las 6 de la mañana le saca un chiste a la hora", () => {
    expect(comentarioDeHora({ h: 6, m: 0 }, 0)).toContain("6:00 a. m.");
    expect(comentarioDeHora({ h: 6, m: 0 }, 0)).toMatch(/duermes/);
  });

  it("el azar solo elige entre frases, siempre válidas", () => {
    for (const azar of [0, 0.3, 0.7, 0.999, 1]) expect(comentarioDeHora({ h: 10, m: 0 }, azar)).toBeTruthy();
  });
});

describe("guion de respaldo", () => {
  it("estudiante con tiempo: le sugiere cupo y bromea con la hora", () => {
    const r = respuestaDeGuion("tengo que ir a la universidad a las 6", { rol: "estudiante", ahora: cincoAM, azar: 0 });
    expect(r.texto).toMatch(/duermes/);
    expect(r.texto).toMatch(/cupo/);
    expect(r.acciones[0].ruta).toBe("/estudiante/cupos?sentido=ida");
  });

  it("estudiante con poco tiempo: pedir ya", () => {
    const r = respuestaDeGuion("voy a la U a las 6", { rol: "estudiante", ahora: seisMenosVeinte, azar: 0 });
    expect(r.acciones.map((a) => a.ruta)).toEqual(["/estudiante/pedir?sentido=ida"]);
  });

  it("de regreso a casa lleva a pedir de regreso", () => {
    const r = respuestaDeGuion("salgo de la u para la casa a las 6:20", { rol: "estudiante", ahora: seisMenosVeinte, azar: 0 });
    expect(r.acciones[0].ruta).toBe("/estudiante/pedir?sentido=regreso");
  });

  it("conductor con hora: publicar cupo", () => {
    const r = respuestaDeGuion("salgo a la U a las 6:30", { rol: "conductor", ahora: cincoAM, azar: 0 });
    expect(r.acciones[0].ruta).toBe("/conductor/cupo/nuevo");
  });

  it("entiende recargas, retiros y documentos", () => {
    expect(respuestaDeGuion("¿cómo recargo?", { rol: "estudiante", ahora: cincoAM, azar: 0 }).acciones[0].ruta).toBe("/billetera");
    expect(respuestaDeGuion("quiero retirar mis ganancias", { rol: "conductor", ahora: cincoAM, azar: 0 }).acciones[0].ruta).toBe("/billetera/retiros");
    expect(respuestaDeGuion("qué documentos necesito", { rol: "conductor", ahora: cincoAM, azar: 0 }).acciones[0].ruta).toBe("/conductor/documentos");
  });

  it("nunca ofrece pantallas de otro rol", () => {
    for (const m of ["voy a la U a las 7", "cupo", "pedir viaje", "documentos", "cancelar", "retirar"]) {
      const estudiante = respuestaDeGuion(m, { rol: "estudiante", ahora: cincoAM, azar: 0.5 });
      for (const a of estudiante.acciones) expect(a.ruta.startsWith("/conductor") || a.ruta.includes("retiros")).toBe(false);
    }
  });

  it("si no entiende, lo dice y sugiere qué preguntar", () => {
    const r = respuestaDeGuion("asdf", { rol: "estudiante", ahora: cincoAM, azar: 0 });
    expect(r.acciones).toEqual([]);
    expect(r.texto.length).toBeGreaterThan(20);
  });
});

describe("respuesta de la IA", () => {
  it("acepta texto y destinos permitidos para el rol", () => {
    const r = interpretarRespuestaIA({ texto: "Busca un cupo.", destinos: ["cupos_ida", "publicar_cupo", "inventado"] }, "estudiante");
    expect(r).toEqual({ texto: "Busca un cupo.", acciones: [{ etiqueta: "Ver cupos hacia la U", ruta: "/estudiante/cupos?sentido=ida" }] });
  });

  it("nunca deja pasar una ruta escrita por la IA", () => {
    const r = interpretarRespuestaIA({ texto: "Ve aquí", destinos: ["https://malo.example", "/admin"] }, "conductor");
    expect(r?.acciones).toEqual([]);
  });

  it("rechaza respuestas sin texto", () => {
    expect(interpretarRespuestaIA({ destinos: [] }, "estudiante")).toBeNull();
    expect(interpretarRespuestaIA({ texto: "   " }, "estudiante")).toBeNull();
    expect(interpretarRespuestaIA("hola", "estudiante")).toBeNull();
  });

  it("recorta textos muy largos y máximo dos destinos", () => {
    const r = interpretarRespuestaIA({ texto: "a".repeat(2000), destinos: ["billetera", "viajes", "perfil"] }, "estudiante");
    expect(r?.texto.length).toBeLessThanOrEqual(900);
    expect(r?.acciones).toHaveLength(2);
  });
});

describe("lo que se manda a la IA", () => {
  it("las instrucciones mencionan el rol y solo sus destinos", () => {
    const texto = instruccionesDelSistema("estudiante", cincoAM);
    expect(texto).toContain("modo estudiante");
    expect(texto).toContain("cupos_ida");
    expect(texto).not.toContain("publicar_cupo");
    expect(destinosPara("conductor")).toContain("publicar_cupo");
  });

  it("el historial empieza por la persona, se recorta y limita el largo", () => {
    const historial = [
      { de: "asistente" as const, texto: "Hola" },
      ...Array.from({ length: 20 }, (_, i) => ({ de: (i % 2 ? "asistente" : "persona") as "persona" | "asistente", texto: "x".repeat(800) })),
    ];
    const recortado = historialParaIA(historial);
    expect(recortado[0].de).toBe("persona");
    expect(recortado.length).toBeLessThanOrEqual(12);
    expect(recortado.every((m) => m.texto.length <= 500)).toBe(true);
  });
});
