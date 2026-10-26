// Pruebas de las validaciones de acceso y de las reglas de rutas.
import { describe, expect, it } from "vitest";
import { destinoSeguro, redireccionPara } from "./rutas";
import {
  erroresPorCampo,
  esquemaEntrar,
  esquemaNuevaClave,
  esquemaRecuperar,
  esquemaRegistro,
} from "./validaciones-auth";

const registroValido = {
  nombre: "  Ana Rojas ",
  correo: " Ana.Rojas@UstaVillavo.edu.co ",
  telefono: "300 123 4567",
  rol: "estudiante",
  clave: "clave1234",
  confirmacion: "clave1234",
  terminos: "on",
};

function erroresDe(datos: Record<string, string>) {
  const resultado = esquemaRegistro.safeParse(datos);
  return resultado.success ? {} : erroresPorCampo(resultado.error);
}

describe("registro", () => {
  it("acepta datos válidos y los normaliza", () => {
    const resultado = esquemaRegistro.safeParse(registroValido);
    expect(resultado.success).toBe(true);
    if (!resultado.success) return;
    expect(resultado.data.nombre).toBe("Ana Rojas");
    expect(resultado.data.correo).toBe("ana.rojas@ustavillavo.edu.co");
    expect(resultado.data.telefono).toBe("+573001234567");
  });

  it("acepta el celular escrito con +57", () => {
    const resultado = esquemaRegistro.safeParse({ ...registroValido, telefono: "+57 300-123-4567" });
    expect(resultado.success && resultado.data.telefono).toBe("+573001234567");
  });

  it("rechaza correos que no son institucionales", () => {
    expect(erroresDe({ ...registroValido, correo: "ana@gmail.com" }).correo).toMatch(/institucional/);
    expect(erroresDe({ ...registroValido, correo: "ana@ustavillavo.edu.co.falso.com" }).correo).toMatch(/institucional/);
    expect(erroresDe({ ...registroValido, correo: "no-es-correo" }).correo).toMatch(/no es válido/);
  });

  it("rechaza celulares mal escritos", () => {
    expect(erroresDe({ ...registroValido, telefono: "12345" }).telefono).toMatch(/10 dígitos/);
    expect(erroresDe({ ...registroValido, telefono: "6001234567" }).telefono).toMatch(/empezar por 3/);
  });

  it("exige una contraseña razonable y que coincida", () => {
    expect(erroresDe({ ...registroValido, clave: "corta1", confirmacion: "corta1" }).clave).toMatch(/al menos 8/);
    expect(erroresDe({ ...registroValido, clave: "solotexto", confirmacion: "solotexto" }).clave).toMatch(/número/);
    expect(erroresDe({ ...registroValido, clave: "12345678", confirmacion: "12345678" }).clave).toMatch(/letra/);
    expect(erroresDe({ ...registroValido, confirmacion: "otra1234" }).confirmacion).toMatch(/no coinciden/);
  });

  it("exige elegir rol y aceptar los términos", () => {
    expect(erroresDe({ ...registroValido, rol: "admin" }).rol).toMatch(/estudiante o conductor/);
    const sinTerminos: Record<string, string> = { ...registroValido };
    delete sinTerminos.terminos;
    expect(erroresDe(sinTerminos).terminos).toMatch(/política de privacidad/);
  });
});

describe("entrar, recuperar y nueva contraseña", () => {
  it("entrar solo exige correo y contraseña", () => {
    expect(esquemaEntrar.safeParse({ correo: "ana@ustavillavo.edu.co", clave: "x" }).success).toBe(true);
    expect(esquemaEntrar.safeParse({ correo: "ana@ustavillavo.edu.co", clave: "" }).success).toBe(false);
  });

  it("recuperar exige el correo institucional", () => {
    expect(esquemaRecuperar.safeParse({ correo: "ana@ustavillavo.edu.co" }).success).toBe(true);
    expect(esquemaRecuperar.safeParse({ correo: "ana@hotmail.com" }).success).toBe(false);
  });

  it("la nueva contraseña cumple las mismas reglas", () => {
    expect(esquemaNuevaClave.safeParse({ clave: "nueva1234", confirmacion: "nueva1234" }).success).toBe(true);
    expect(esquemaNuevaClave.safeParse({ clave: "nueva1234", confirmacion: "nueva12345" }).success).toBe(false);
  });
});

describe("rutas", () => {
  it("sin sesión, la zona privada manda a entrar y recuerda a dónde iba", () => {
    expect(redireccionPara("/inicio", false)).toBe("/entrar?siguiente=%2Finicio");
    expect(redireccionPara("/elegir-rol", false)).toBe("/entrar?siguiente=%2Felegir-rol");
    expect(redireccionPara("/", false)).toBeNull();
    expect(redireccionPara("/entrar", false)).toBeNull();
  });

  it("con sesión, las pantallas de acceso mandan al inicio", () => {
    expect(redireccionPara("/entrar", true)).toBe("/inicio");
    expect(redireccionPara("/registro", true)).toBe("/inicio");
    expect(redireccionPara("/inicio", true)).toBeNull();
  });

  it("las pantallas de estudiante, conductor, viajes y perfil también piden sesión", () => {
    expect(redireccionPara("/estudiante", false)).toBe("/entrar?siguiente=%2Festudiante");
    expect(redireccionPara("/estudiante/pedir", false)).toBe("/entrar?siguiente=%2Festudiante%2Fpedir");
    expect(redireccionPara("/conductor/viaje", false)).toBe("/entrar?siguiente=%2Fconductor%2Fviaje");
    expect(redireccionPara("/viajes", false)).toBe("/entrar?siguiente=%2Fviajes");
    expect(redireccionPara("/perfil", false)).toBe("/entrar?siguiente=%2Fperfil");
    expect(redireccionPara("/admin", false)).toBe("/entrar?siguiente=%2Fadmin");
    expect(redireccionPara("/estudiante", true)).toBeNull();
  });

  it("no confunde rutas que solo empiezan parecido", () => {
    expect(redireccionPara("/iniciosesion", false)).toBeNull();
  });

  it("destinoSeguro solo deja rutas internas", () => {
    expect(destinoSeguro("/nueva-clave")).toBe("/nueva-clave");
    expect(destinoSeguro("//sitio-malo.com")).toBe("/inicio");
    expect(destinoSeguro("https://sitio-malo.com")).toBe("/inicio");
    expect(destinoSeguro("/\\sitio-malo.com")).toBe("/inicio");
    expect(destinoSeguro(null)).toBe("/inicio");
  });

  it("destinoSeguro no deja pasar tabs, saltos de línea ni espacios (el navegador los borra)", () => {
    expect(destinoSeguro("/\t/sitio-malo.com")).toBe("/inicio");
    expect(destinoSeguro("/\n/sitio-malo.com")).toBe("/inicio");
    expect(destinoSeguro("/\r\n/sitio-malo.com")).toBe("/inicio");
    expect(destinoSeguro("/ /sitio-malo.com")).toBe("/inicio");
    expect(destinoSeguro("/estudiante/cupos/1?x=1")).toBe("/estudiante/cupos/1?x=1");
  });
});
