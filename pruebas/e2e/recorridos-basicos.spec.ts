import { expect, test } from "@playwright/test";

test("la billetera y las colas requieren sesión y conservan el destino", async ({ page }) => {
  for (const destino of ["/billetera", "/admin", "/conductor/documentos", "/estudiante/cupos"]) {
    await page.goto(destino);
    const entrada = new URL(page.url());
    expect(entrada.pathname).toBe("/entrar");
    expect(entrada.searchParams.get("siguiente")).toBe(destino);
  }
});

test("el registro avisa cuando el correo no es institucional", async ({ page }) => {
  await page.goto("/registro");
  const correo = page.getByRole("textbox", { name: /Correo institucional/ });
  await correo.fill("estudiante@example.test");
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  await expect(page.getByText(/Usa tu correo institucional/).first()).toBeVisible();
  await expect(correo).toHaveValue("estudiante@example.test");
  await expect(correo).toHaveAttribute("aria-invalid", "true");
});

test("un viaje protegido muestra la página sin conexión y recupera la navegación", async ({ page, context }) => {
  await page.goto("/");
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.goto("/viajes");
  await expect(page.getByRole("heading", { name: "Sin conexión" })).toBeVisible();
  await context.setOffline(false);
  await page.goto("/viajes");
  await expect(page).toHaveURL(/\/entrar\?siguiente=%2Fviajes/);
});

test("el webhook rechaza una solicitud incompleta sin comunicarse con Wompi", async ({ request }) => {
  const evento = await request.post("/api/v1/pagos/wompi", { data: {} });
  expect(evento.status()).toBe(400);
  expect(await evento.json()).toEqual({ recibido: false });
});
