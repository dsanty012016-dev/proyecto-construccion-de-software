import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // docs/ guarda la landing original en HTML y supabase/functions/ es código
  // de Deno (funciones de Supabase): no se revisan con ESLint.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "docs/**", "supabase/functions/**"]),
]);

export default eslintConfig;
