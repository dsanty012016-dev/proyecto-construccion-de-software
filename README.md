# UniGo · Tu viaje, tu universidad

App web (PWA) de movilidad estudiantil universitaria para Villavicencio: estudiantes y conductores verificados comparten el viaje hacia la universidad. Proyecto académico.

**En línea:** https://unigoproject.vercel.app (se publica solo con cada merge a `main`).

**Estado:** piloto académico, fases 0 a 9. Ver `docs/plan.md`.

## Cómo correrlo en el computador
Requiere Node 22 o superior.

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm test         # pruebas de las reglas del viaje
npm run build
```

Las variables de entorno van en `.env.local` (nunca se sube) y, para producción, en Vercel (Settings → Environment Variables). El archivo `.env.example` lista sus nombres, sin valores. La configuración de Supabase Auth está en `docs/supabase-auth.md`.

## Documentación
- `AGENTS.md`: reglas de código y organización.
- `docs/reglas.md`: reglas del viaje y preguntas abiertas.
- `docs/identidad.md`: colores, tipografía y logos.
- `docs/plan.md`: fases del trabajo.
- `docs/diseno/`: mockups.
- `supabase/migraciones/`: base de datos (cómo aplicarla y probarla en su README).
- `docs/landing-original/`: la landing en HTML del equipo, conservada como referencia.

## Stack
Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Supabase · Vercel.
