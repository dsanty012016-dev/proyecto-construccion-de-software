// Configuración de las pruebas (Vitest). Solo busca pruebas dentro de app/.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["app/**/*.test.ts"],
    environment: "node",
  },
});
