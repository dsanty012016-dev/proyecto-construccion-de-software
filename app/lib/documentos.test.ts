// Pruebas de las reglas de los documentos del conductor.
import { describe, expect, it } from "vitest";
import { nombreDocumento, problemaConArchivo, rutaDocumento, rutaValida, verificado } from "./documentos";

const id = "2f1c3a8e-9b7d-4c1e-8a55-0d6f3b2a9c11";

describe("archivos", () => {
  it("acepta fotos y PDF de hasta 5 MB", () => {
    expect(problemaConArchivo({ type: "image/jpeg", size: 1000 })).toBeNull();
    expect(problemaConArchivo({ type: "application/pdf", size: 5 * 1024 * 1024 })).toBeNull();
    expect(problemaConArchivo({ type: "image/gif", size: 1000 })).toMatch(/JPG/);
    expect(problemaConArchivo({ type: "image/png", size: 0 })).toMatch(/vacío/);
    expect(problemaConArchivo({ type: "image/png", size: 5 * 1024 * 1024 + 1 })).toMatch(/5 MB/);
  });

  it("guarda cada archivo en la carpeta del conductor", () => {
    const ruta = rutaDocumento(id, "licencia", "image/png", 1700000000000);
    expect(ruta).toBe(`${id}/licencia-1700000000000.png`);
    expect(rutaValida(ruta, id)).toBe(true);
    expect(rutaValida(ruta, "00000000-0000-0000-0000-000000000000")).toBe(false);
    expect(rutaValida(`../${id}/x.png`, id)).toBe(false);
  });
});

describe("estado", () => {
  it("verificado solo con los tres aprobados", () => {
    expect(verificado({ cedula: "aprobado", licencia: "aprobado", tarjeta_propiedad: "aprobado" })).toBe(true);
    expect(verificado({ cedula: "aprobado", licencia: "pendiente", tarjeta_propiedad: "aprobado" })).toBe(false);
    expect(verificado({})).toBe(false);
  });

  it("nombra los documentos", () => {
    expect(nombreDocumento("tarjeta_propiedad")).toBe("Tarjeta de propiedad");
  });
});
