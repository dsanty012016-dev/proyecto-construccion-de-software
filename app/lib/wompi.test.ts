// Pruebas de lo que UniGo arma para Wompi (wompi.ts).
import { describe, expect, it } from "vitest";
import { ambienteWompi, esReferencia, firmaDeIntegridad, pareceEventoWompi, secretoDelMismoAmbiente, urlDeCheckout } from "./wompi";

describe("ambiente", () => {
  it("lo dice el nombre de la llave pública", () => {
    expect(ambienteWompi("pub_test_abc")).toBe("pruebas");
    expect(ambienteWompi("pub_prod_abc")).toBe("real");
  });

  it("sin llave, o con otra cosa, no hay pasarela", () => {
    expect(ambienteWompi(undefined)).toBeNull();
    expect(ambienteWompi("")).toBeNull();
    expect(ambienteWompi("prv_test_abc")).toBeNull();
  });

  it("el secreto de integridad debe ser del mismo ambiente", () => {
    expect(secretoDelMismoAmbiente("pruebas", "test_integrity_abc")).toBe(true);
    expect(secretoDelMismoAmbiente("real", "prod_integrity_abc")).toBe(true);
    expect(secretoDelMismoAmbiente("real", "test_integrity_abc")).toBe(false);
    expect(secretoDelMismoAmbiente("pruebas", undefined)).toBe(false);
  });
});

describe("firma de integridad", () => {
  it("da el mismo resultado que el ejemplo de la documentación de Wompi", () => {
    expect(firmaDeIntegridad("sk8-438k4-xmxm392-sn2m", 2490000, "prod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6")).toBe(
      "37c8407747e595535433ef8f6a811d853cd943046624a0ec04662b17bbf33bf5",
    );
  });

  it("cambia si cambia el monto, la referencia o el secreto", () => {
    const base = firmaDeIntegridad("ref", 2000000, "secreto");
    expect(firmaDeIntegridad("ref", 2000001, "secreto")).not.toBe(base);
    expect(firmaDeIntegridad("otra", 2000000, "secreto")).not.toBe(base);
    expect(firmaDeIntegridad("ref", 2000000, "otro")).not.toBe(base);
  });
});

describe("página de pago", () => {
  const referencia = "0b9f4a52-6c0e-4d0a-9a43-5f6f0c7f2b11";
  const url = new URL(
    urlDeCheckout({
      llavePublica: "pub_test_abc",
      secretoIntegridad: "test_integrity_xyz",
      referencia,
      monto: 20000,
      volverA: `https://unigo.example/billetera/recarga/${referencia}`,
    }),
  );

  it("va a la página de Wompi con el monto en centavos y en pesos colombianos", () => {
    expect(url.origin + url.pathname).toBe("https://checkout.wompi.co/p/");
    expect(url.searchParams.get("public-key")).toBe("pub_test_abc");
    expect(url.searchParams.get("amount-in-cents")).toBe("2000000");
    expect(url.searchParams.get("currency")).toBe("COP");
    expect(url.searchParams.get("reference")).toBe(referencia);
    expect(url.searchParams.get("redirect-url")).toBe(`https://unigo.example/billetera/recarga/${referencia}`);
  });

  it("lleva la firma de ese monto y esa referencia, y nunca el secreto", () => {
    expect(url.searchParams.get("signature:integrity")).toBe(firmaDeIntegridad(referencia, 2000000, "test_integrity_xyz"));
    expect(url.toString()).not.toContain("test_integrity_xyz");
  });
});

describe("referencia", () => {
  it("solo acepta ids de recarga", () => {
    expect(esReferencia("0b9f4a52-6c0e-4d0a-9a43-5f6f0c7f2b11")).toBe(true);
    expect(esReferencia("0B9F4A52-6C0E-4D0A-9A43-5F6F0C7F2B11")).toBe(false);
    expect(esReferencia("../admin")).toBe(false);
    expect(esReferencia("")).toBe(false);
  });
});

describe("aviso de Wompi", () => {
  const evento = {
    event: "transaction.updated",
    data: { transaction: { id: "1234-1610641025-49201", status: "APPROVED", amount_in_cents: 2000000 } },
    environment: "test",
    signature: { properties: ["transaction.id", "transaction.status", "transaction.amount_in_cents"], checksum: "ABC123" },
    timestamp: 1530291411,
    sent_at: "2018-07-20T16:45:05.000Z",
  };

  it("reconoce la forma de un aviso", () => {
    expect(pareceEventoWompi(evento)).toBe(true);
  });

  it("descarta lo que no tiene esa forma", () => {
    expect(pareceEventoWompi(null)).toBe(false);
    expect(pareceEventoWompi([])).toBe(false);
    expect(pareceEventoWompi({ ...evento, signature: undefined })).toBe(false);
    expect(pareceEventoWompi({ ...evento, signature: { checksum: "x", properties: [] } })).toBe(false);
    expect(pareceEventoWompi({ ...evento, timestamp: "ayer" })).toBe(false);
  });
});
