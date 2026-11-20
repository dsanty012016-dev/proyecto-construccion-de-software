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

  const repetir = page.getByRole("button", { name: "Ver animación de apertura" });
  await repetir.click();
  await expect(page.locator("html")).toHaveAttribute("data-apertura-observada", "sí");
  await expect(page.locator(".apertura-unigo-vehiculo")).toHaveCSS("animation-name", "unigo-recorrer");
  await page.keyboard.press("Escape");
  await expect(page.locator(".apertura-unigo")).toBeHidden();
  await expect(repetir).toBeFocused();
});

test("movimiento reducido muestra el acceso sin animación", async ({ page }) => {
  await page.goto("/entrar");
  const titulo = page.getByRole("heading", { name: "Qué bueno verte." });
  await expect(titulo).toBeVisible();
  await expect(titulo).toHaveCSS("animation-name", "none");
  await expect(page.locator(".apertura-unigo")).toBeHidden();
  await expect(page.getByRole("button", { name: "Ver animación de apertura" })).toBeHidden();
  await expect(page.getByText("Tu dispositivo tiene activado Reducir movimiento.")).toBeVisible();
  const correo = page.getByRole("textbox", { name: "Correo institucional" });
  await correo.fill("persona@example.test");
  await expect(correo).toHaveValue("persona@example.test");
});

test("al navegar entre pantallas de acceso se presenta el formulario", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    document.addEventListener("animationstart", (evento) => {
      if (evento.animationName === "unigo-presentar" && evento.target instanceof HTMLFormElement) {
        evento.target.dataset.entradaObservada = "sí";
      }
    });
  });
  await page.goto("/entrar");
  await page.getByRole("link", { name: "Crear cuenta", exact: true }).click();
  await expect(page).toHaveURL(/\/registro$/);
  await expect(page.locator("main form")).toHaveAttribute("data-entrada-observada", "sí");
  await expect(page.locator("main form")).toHaveCSS("animation-duration", "0.52s");
});
