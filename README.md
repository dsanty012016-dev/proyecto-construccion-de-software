# UniGo · Tu viaje, tu universidad

App web (PWA) de movilidad estudiantil universitaria para Villavicencio: estudiantes y conductores verificados comparten el viaje hacia la universidad. Proyecto académico.

**Estado:** fase 0 (base del proyecto). Ver `docs/plan.md`.

## Cómo correrlo
Requiere Node 22 o superior.

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm run build
```

Las variables de entorno van en `.env.local` (nunca se sube). El archivo `.env.example` lista sus nombres, sin valores.

## Documentación
- `AGENTS.md`: reglas de código y organización.
- `docs/reglas.md`: reglas del viaje y preguntas abiertas.
- `docs/identidad.md`: colores, tipografía y logos.
- `docs/plan.md`: fases del trabajo.
- `docs/diseno/`: mockups.
- `docs/landing-original/`: la landing en HTML del equipo, conservada como referencia.

## Stack
Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Supabase · Vercel.
