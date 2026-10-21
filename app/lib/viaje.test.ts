// Pruebas de las reglas del viaje (app/lib/viaje.ts). Se corren con `npm test`.
import { describe, expect, it } from "vitest";
import {
  aplicarAccion,
  crearViaje,
  estaActivo,
  etiquetaEstado,
  ofertasActivas,
  precioValido,
  puedeCancelar,
  puntoValido,
  tieneOfertas,
  PRECIO_MAXIMO,
  PRECIO_MINIMO,
  type Accion,
  type Viaje,
} from "./viaje";

const T0 = 1_760_000_000_000; // una hora cualquiera, fija
const ESTUDIANTE = "est-1";
const CONDUCTOR_A = "con-a";
const CONDUCTOR_B = "con-b";
const OTRO = "otro";

const ORIGEN = { lat: 4.142, lng: -73.626, texto: "Barrio La Esperanza" };
const DESTINO = { lat: 4.08, lng: -73.58, texto: "USTA Villavicencio" };

function viajeNuevo(): Viaje {
  const viaje = crearViaje({
    id: "v-1",
    estudianteId: ESTUDIANTE,
    origen: ORIGEN,
    destino: DESTINO,
    ahora: T0,
  });
  if (!viaje) throw new Error("el viaje de prueba debería ser válido");
  return viaje;
}

/** Aplica varias acciones seguidas, avanzando un minuto entre cada una. */
function aplicar(viaje: Viaje, ...acciones: Accion[]): Viaje {
  return acciones.reduce(
    (v, accion, i) => aplicarAccion(v, accion, T0 + (i + 1) * 60_000),
    viaje,
  );
}

const ofertaA: Accion = {
  tipo: "ofertar",
  ofertaId: "o-a",
  conductorId: CONDUCTOR_A,
  precio: 8_000,
};
const ofertaB: Accion = {
  tipo: "ofertar",
  ofertaId: "o-b",
  conductorId: CONDUCTOR_B,
  precio: 7_000,
};
const aceptarA: Accion = {
  tipo: "aceptar_oferta",
  estudianteId: ESTUDIANTE,
  ofertaId: "o-a",
};

function viajeAceptado(): Viaje {
  return aplicar(viajeNuevo(), ofertaA, ofertaB, aceptarA);
}

describe("crearViaje", () => {
  it("crea un viaje solicitado, sin ofertas ni conductor", () => {
    const viaje = viajeNuevo();
    expect(viaje.estado).toBe("solicitado");
    expect(viaje.ofertas).toEqual([]);
    expect(viaje.conductorId).toBeNull();
    expect(viaje.precio).toBeNull();
    expect(viaje.creadoEn).toBe(T0);
    expect(estaActivo(viaje)).toBe(true);
  });

  it("quita espacios sobrantes de las direcciones", () => {
    const viaje = crearViaje({
      id: "v",
      estudianteId: ESTUDIANTE,
      origen: { ...ORIGEN, texto: "  Calle 1  " },
      destino: DESTINO,
      ahora: T0,
    });
    expect(viaje?.origen.texto).toBe("Calle 1");
  });

  it("rechaza puntos inválidos o iguales", () => {
    const base = { id: "v", estudianteId: ESTUDIANTE, ahora: T0 };
    expect(
      crearViaje({ ...base, origen: { ...ORIGEN, lat: 91 }, destino: DESTINO }),
    ).toBeNull();
    expect(
      crearViaje({ ...base, origen: { ...ORIGEN, texto: "  " }, destino: DESTINO }),
    ).toBeNull();
    expect(crearViaje({ ...base, origen: ORIGEN, destino: ORIGEN })).toBeNull();
  });
});

describe("validaciones", () => {
  it("precioValido respeta los límites y exige entero", () => {
    expect(precioValido(PRECIO_MINIMO)).toBe(true);
    expect(precioValido(PRECIO_MAXIMO)).toBe(true);
    expect(precioValido(PRECIO_MINIMO - 1)).toBe(false);
    expect(precioValido(PRECIO_MAXIMO + 1)).toBe(false);
    expect(precioValido(5_000.5)).toBe(false);
    expect(precioValido(Number.NaN)).toBe(false);
  });

  it("puntoValido revisa coordenadas y texto", () => {
    expect(puntoValido(ORIGEN)).toBe(true);
    expect(puntoValido({ ...ORIGEN, lng: -181 })).toBe(false);
    expect(puntoValido({ ...ORIGEN, lat: Number.POSITIVE_INFINITY })).toBe(false);
    expect(puntoValido({ ...ORIGEN, texto: "x".repeat(201) })).toBe(false);
  });
});

describe("ofertas", () => {
  it("un conductor oferta y el viaje pasa a 'con ofertas'", () => {
    const viaje = aplicar(viajeNuevo(), ofertaA);
    expect(viaje.estado).toBe("solicitado");
    expect(tieneOfertas(viaje)).toBe(true);
    expect(etiquetaEstado(viaje)).toBe("Con ofertas");
    expect(ofertasActivas(viaje)).toHaveLength(1);
    expect(viaje.ofertas[0]).toMatchObject({
      id: "o-a",
      conductorId: CONDUCTOR_A,
      precio: 8_000,
      estado: "activa",
    });
  });

  it("volver a ofertar cambia el precio sin duplicar la oferta", () => {
    const viaje = aplicar(viajeNuevo(), ofertaA, {
      ...ofertaA,
      ofertaId: "o-a2",
      precio: 6_500,
    });
    expect(viaje.ofertas).toHaveLength(1);
    expect(viaje.ofertas[0]).toMatchObject({ id: "o-a", precio: 6_500 });
  });

  it("el estudiante no puede ofertarse a sí mismo", () => {
    const viaje = viajeNuevo();
    const despues = aplicarAccion(
      viaje,
      { ...ofertaA, conductorId: ESTUDIANTE },
      T0,
    );
    expect(despues).toBe(viaje);
  });

  it("un precio fuera de límites no cambia nada", () => {
    const viaje = viajeNuevo();
    expect(aplicarAccion(viaje, { ...ofertaA, precio: 500 }, T0)).toBe(viaje);
  });

  it("no se aceptan dos ofertas con el mismo id de conductores distintos", () => {
    const viaje = aplicar(viajeNuevo(), ofertaA);
    expect(aplicarAccion(viaje, { ...ofertaB, ofertaId: "o-a" }, T0)).toBe(viaje);
  });

  it("retirar una oferta la deja sin efecto y se puede volver a ofertar", () => {
    const retirada = aplicar(viajeNuevo(), ofertaA, {
      tipo: "retirar_oferta",
      conductorId: CONDUCTOR_A,
    });
    expect(retirada.ofertas[0].estado).toBe("retirada");
    expect(tieneOfertas(retirada)).toBe(false);
    expect(etiquetaEstado(retirada)).toBe("Buscando conductor");

    const otraVez = aplicar(retirada, ofertaA);
    expect(otraVez.ofertas[0].estado).toBe("activa");
  });

  it("retirar sin tener oferta no cambia nada", () => {
    const viaje = viajeNuevo();
    expect(
      aplicarAccion(viaje, { tipo: "retirar_oferta", conductorId: OTRO }, T0),
    ).toBe(viaje);
  });
});

describe("aceptar una oferta", () => {
  it("asigna conductor y precio, y rechaza las demás ofertas", () => {
    const viaje = viajeAceptado();
    expect(viaje.estado).toBe("aceptado");
    expect(viaje.conductorId).toBe(CONDUCTOR_A);
    expect(viaje.precio).toBe(8_000);
    expect(viaje.aceptadoEn).not.toBeNull();
    expect(etiquetaEstado(viaje)).toBe("Conductor en camino");
    const estados = Object.fromEntries(viaje.ofertas.map((o) => [o.id, o.estado]));
    expect(estados).toEqual({ "o-a": "aceptada", "o-b": "rechazada" });
  });

  it("solo el estudiante dueño del viaje puede aceptar", () => {
    const viaje = aplicar(viajeNuevo(), ofertaA);
    expect(aplicarAccion(viaje, { ...aceptarA, estudianteId: OTRO }, T0)).toBe(viaje);
  });

  it("no se puede aceptar una oferta retirada ni una que no existe", () => {
    const retirada = aplicar(viajeNuevo(), ofertaA, {
      tipo: "retirar_oferta",
      conductorId: CONDUCTOR_A,
    });
    expect(aplicarAccion(retirada, aceptarA, T0)).toBe(retirada);
    expect(
      aplicarAccion(retirada, { ...aceptarA, ofertaId: "no-existe" }, T0),
    ).toBe(retirada);
  });

  it("después de aceptar ya no se puede ofertar ni retirar", () => {
    const viaje = viajeAceptado();
    expect(aplicarAccion(viaje, { ...ofertaB, precio: 5_000 }, T0)).toBe(viaje);
    expect(
      aplicarAccion(viaje, { tipo: "retirar_oferta", conductorId: CONDUCTOR_A }, T0),
    ).toBe(viaje);
    expect(aplicarAccion(viaje, aceptarA, T0)).toBe(viaje);
  });
});

describe("iniciar y terminar", () => {
  it("el conductor asignado lo inicia y lo termina", () => {
    const enCurso = aplicar(viajeAceptado(), {
      tipo: "iniciar",
      conductorId: CONDUCTOR_A,
    });
    expect(enCurso.estado).toBe("en_curso");
    expect(enCurso.iniciadoEn).not.toBeNull();

    const terminado = aplicar(enCurso, { tipo: "terminar", conductorId: CONDUCTOR_A });
    expect(terminado.estado).toBe("terminado");
    expect(terminado.terminadoEn).not.toBeNull();
    expect(estaActivo(terminado)).toBe(false);
  });

  it("otro conductor no puede iniciar ni terminar", () => {
    const aceptado = viajeAceptado();
    expect(
      aplicarAccion(aceptado, { tipo: "iniciar", conductorId: CONDUCTOR_B }, T0),
    ).toBe(aceptado);
    const enCurso = aplicar(aceptado, { tipo: "iniciar", conductorId: CONDUCTOR_A });
    expect(
      aplicarAccion(enCurso, { tipo: "terminar", conductorId: CONDUCTOR_B }, T0),
    ).toBe(enCurso);
  });

  it("no se salta pasos: no se termina sin iniciar ni se inicia sin aceptar", () => {
    const aceptado = viajeAceptado();
    expect(
      aplicarAccion(aceptado, { tipo: "terminar", conductorId: CONDUCTOR_A }, T0),
    ).toBe(aceptado);
    const nuevo = aplicar(viajeNuevo(), ofertaA);
    expect(
      aplicarAccion(nuevo, { tipo: "iniciar", conductorId: CONDUCTOR_A }, T0),
    ).toBe(nuevo);
  });
});

describe("cancelar (regla provisional)", () => {
  it("el estudiante cancela mientras busca conductor", () => {
    const viaje = aplicar(viajeNuevo(), ofertaA, {
      tipo: "cancelar",
      usuarioId: ESTUDIANTE,
    });
    expect(viaje.estado).toBe("cancelado");
    expect(viaje.canceladoPor).toBe(ESTUDIANTE);
    expect(viaje.ofertas[0].estado).toBe("rechazada");
    expect(estaActivo(viaje)).toBe(false);
  });

  it("un conductor que solo ofertó no puede cancelar el viaje", () => {
    const viaje = aplicar(viajeNuevo(), ofertaA);
    expect(puedeCancelar(viaje, CONDUCTOR_A)).toBe(false);
    expect(
      aplicarAccion(viaje, { tipo: "cancelar", usuarioId: CONDUCTOR_A }, T0),
    ).toBe(viaje);
  });

  it("ya aceptado, cancelan el estudiante o el conductor asignado", () => {
    const aceptado = viajeAceptado();
    expect(puedeCancelar(aceptado, ESTUDIANTE)).toBe(true);
    expect(puedeCancelar(aceptado, CONDUCTOR_A)).toBe(true);
    expect(puedeCancelar(aceptado, CONDUCTOR_B)).toBe(false);

    const cancelado = aplicar(aceptado, { tipo: "cancelar", usuarioId: CONDUCTOR_A });
    expect(cancelado.estado).toBe("cancelado");
    expect(cancelado.canceladoPor).toBe(CONDUCTOR_A);
  });

  it("en curso o terminado ya no se cancela", () => {
    const enCurso = aplicar(viajeAceptado(), {
      tipo: "iniciar",
      conductorId: CONDUCTOR_A,
    });
    expect(
      aplicarAccion(enCurso, { tipo: "cancelar", usuarioId: ESTUDIANTE }, T0),
    ).toBe(enCurso);
    const terminado = aplicar(enCurso, { tipo: "terminar", conductorId: CONDUCTOR_A });
    expect(
      aplicarAccion(terminado, { tipo: "cancelar", usuarioId: ESTUDIANTE }, T0),
    ).toBe(terminado);
  });

  it("un viaje cancelado no admite ninguna acción", () => {
    const cancelado = aplicar(viajeNuevo(), { tipo: "cancelar", usuarioId: ESTUDIANTE });
    const acciones: Accion[] = [
      ofertaA,
      aceptarA,
      { tipo: "iniciar", conductorId: CONDUCTOR_A },
      { tipo: "cancelar", usuarioId: ESTUDIANTE },
    ];
    for (const accion of acciones) {
      expect(aplicarAccion(cancelado, accion, T0)).toBe(cancelado);
    }
  });
});

describe("pureza", () => {
  it("no modifica el viaje original", () => {
    const original = aplicar(viajeNuevo(), ofertaA);
    const copia = structuredClone(original);
    aplicar(original, ofertaB, aceptarA, { tipo: "iniciar", conductorId: CONDUCTOR_A });
    expect(original).toEqual(copia);
  });
});
