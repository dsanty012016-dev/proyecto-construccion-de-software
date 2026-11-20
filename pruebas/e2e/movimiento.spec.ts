import { expect, test } from "@playwright/test";

test("la apertura aparece una vez y se cierra al usar el teclado", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    document.addEventListener("animationstart", (evento) => {
      if (evento.animationName === "unigo-abrir") document.documentElement.dataset.aperturaObservada = "sí";
    });
  });

  await page.goto("/entrar");
  await expect(page.locator("html")).toHaveAttribute("data-apertura-observada", "sí");
  await page.keyboard.press("Tab");
  await expect(page.locator(".apertura-unigo")).toBeHidden();
  await expect(page.getByRole("link", { name: "UniGo, ir a la portada" })).toBeFocused();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Qué bueno verte." })).toBeVisible();
  await expect(page.locator(".apertura-unigo")).toBeHidden();
  expect(await page.locator("html").getAttribute("data-apertura-observada")).toBeNull();
});

test("movimiento reducido muestra el acceso sin animación", async ({ page }) => {
  await page.goto("/entrar");
  const titulo = page.getByRole("heading", { name: "Qué bueno verte." });
  await expect(titulo).toBeVisible();
  await expect(titulo).toHaveCSS("animation-name", "none");
  await expect(page.locator(".apertura-unigo")).toBeHidden();
  const correo = page.getByRole("textbox", { name: "Correo institucional" });
  await correo.fill("persona@example.test");
  await expect(correo).toHaveValue("persona@example.test");
});
