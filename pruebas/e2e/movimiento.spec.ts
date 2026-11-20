import { devices, expect, test } from "@playwright/test";

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

test("el reflejo cambia el tema en ambos sentidos y conserva la elección", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    document.addEventListener("animationstart", (evento) => {
      if (evento.animationName === "reflejo-entrada") {
        document.documentElement.dataset.reflejoObservado = document.documentElement.dataset.tema;
      }
    });
  });
  await page.goto("/entrar");
  const cambiar = page.getByRole("button", { name: "Cambiar entre modo claro y modo oscuro" });
  const html = page.locator("html");
  for (const modo of ["oscuro", "claro"]) {
    await cambiar.click();
    await expect(html).toHaveAttribute("data-reflejo-observado", modo);
    await expect(html).not.toHaveClass(/tema-reflejo/);
  }
  await page.reload();
  await expect(html).toHaveAttribute("data-tema", "claro");
});

test("el selector de tema cambia al instante con movimiento reducido", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/entrar");
  await page.getByRole("button", { name: "Cambiar entre modo claro y modo oscuro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-tema", "oscuro");
  await expect(page.locator("html")).not.toHaveClass(/tema-reflejo/);
});

test.describe("reflejo en Android", () => {
  const { userAgent, viewport, deviceScaleFactor, hasTouch, isMobile } = devices["Pixel 7"];
  test.use({ userAgent, viewport, deviceScaleFactor, hasTouch, isMobile });

  test("usa el mismo reflejo original en ambos sentidos", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
    await page.addInitScript(() => {
      document.addEventListener("animationstart", (evento) => {
        if (evento.animationName === "reflejo-entrada") {
          document.documentElement.dataset.reflejoObservado = document.documentElement.dataset.tema;
        }
      });
    });
    await page.goto("/entrar");
    const cambiar = page.getByRole("button", { name: "Cambiar entre modo claro y modo oscuro" });
    const html = page.locator("html");
    for (const tema of ["oscuro", "claro"]) {
      await cambiar.tap();
      await expect(html).toHaveAttribute("data-reflejo-observado", tema);
      await expect(html).not.toHaveClass(/tema-reflejo/);
    }
    await page.reload();
    await expect(html).toHaveAttribute("data-tema", "claro");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.getByText("Tu dispositivo tiene activado Reducir movimiento.")).toBeVisible();
    await cambiar.tap();
    await expect(html).toHaveAttribute("data-tema", "oscuro");
    expect(await html.getAttribute("data-reflejo-observado")).toBeNull();
  });
});

test("un navegador sin transiciones de pantalla cambia el tema al instante", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
  await page.addInitScript(() => Object.defineProperty(document, "startViewTransition", { value: undefined }));
  await page.goto("/entrar");
  await page.getByRole("button", { name: "Cambiar entre modo claro y modo oscuro" }).click();
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-tema", "oscuro");
  await expect(html).not.toHaveClass(/tema-reflejo/);
});
