import { describe, expect, it } from "vitest";
import { enlaceDeAyuda } from "./ayuda";

describe("ayuda por WhatsApp", () => {
  it.each([undefined, "", "00123456789", "57/123456789", "573001234567?text=otra cosa"])(
    "oculta el enlace si el destino no es un número internacional válido (%s)",
    (numero) => {
      expect(enlaceDeAyuda(numero, { tipo: "general" })).toBeNull();
    },
  );

  it("abre el chat del equipo con una referencia de la falta que se quiere revisar", () => {
    const url = new URL(enlaceDeAyuda("+57 (300) 123-4567", { tipo: "falta", referencia: "falta-123" })!);
    expect(url.origin).toBe("https://wa.me");
    expect(url.pathname).toBe("/573001234567");
    expect(url.searchParams.get("text")).toBe(
      "Hola, equipo UniGo. Quisiera solicitar la revisión de una falta. Referencia: falta-123.",
    );
  });

  it.each(["viaje", "cupo"] as const)("identifica el %s con un borrador y una referencia", (tipo) => {
    const url = new URL(enlaceDeAyuda("573001234567", { tipo, referencia: "a&b" })!);
    expect([...url.searchParams.keys()]).toEqual(["text"]);
    expect(url.searchParams.get("text")).toBe(`Hola, equipo UniGo. Necesito ayuda con mi ${tipo}. Referencia: a&b.`);
  });
});
