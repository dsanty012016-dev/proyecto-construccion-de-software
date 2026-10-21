# UniGo: reglas del proyecto

Léelo completo antes de tocar código. Detalle en `docs/`: `reglas.md` (reglas del viaje), `identidad.md` (colores y fuentes), `plan.md` (fases y modelos), `diseno/` (mockups).

## Qué es
App web de movilidad estudiantil universitaria en **Villavicencio**, estilo InDrive pero para estudiantes: viajes del punto A a la universidad, con posibilidad de varias recogidas por viaje. Dos roles: **estudiante** y **conductor** (se llama "estudiante", no "pasajero", como en los mockups). Proyecto académico en equipo. Lema: "Tu viaje, tu universidad". Idioma de todo: español.

## Stack
Next.js 16 (App Router) · React 19 · TypeScript estricto · Tailwind 4 · Supabase (Auth con `@supabase/ssr`, Postgres con RLS, Realtime) · Vercel. Es una PWA pensada primero para celular (mockups de ~360 px de ancho).
Si dudas de una API de Next 16, consulta la documentación oficial; no asumas.

## Organización (igual que Duelo 64, con `ui/` por zonas)
- `app/` rutas. Grupos: `(sitio)` landing pública con A-Frame, `(auth)` login/registro/recuperar, `(app)` zona privada con barra inferior (`estudiante/`, `conductor/`, `viajes/`, `wallet/`, `perfil/`). `app/api/v1/` solo para lo que haga falta exponer a una futura app nativa.
- `app/lib/` lógica sin pantalla: `viaje.ts` (reglas puras del viaje, con pruebas), `viaje-online.ts` (hook de Realtime), `acciones-*.ts` (Server Actions), `supabase/client.ts` y `server.ts`.
- `app/ui/` componentes en subcarpetas: `comun/`, `auth/`, `estudiante/`, `conductor/`, `sitio/`. Nombres de archivo en español y con guiones.
- `supabase/migraciones/` SQL numerado (`001-perfiles.sql`, `002-...`). Todo cambio de base de datos va ahí, nunca solo en el panel.
- `docs/landing-original/` es el HTML viejo del equipo: referencia, no se edita.

## Reglas de código
1. Las reglas del viaje (estados, ofertas, cancelación) son **funciones puras**: sin React, sin `Date.now()` ni `Math.random()`; la hora y el azar entran por parámetro. Cada regla lleva prueba.
2. Si una jugada o acción no es válida, la función devuelve el mismo estado; no lanza error.
3. Los cambios de datos pasan por Server Actions que llaman a funciones RPC de Supabase. Toda tabla con **RLS activado**; las reglas de seguridad viven en la base de datos, no en la pantalla.
4. Componentes con `"use client"` solo si necesitan clics, estado, efectos o APIs del navegador. Las páginas con `metadata` son Server Components.
5. Colores solo con los tokens de `app/globals.css` (`bg-fondo`, `bg-superficie`, `bg-primario`, `text-texto`, `text-texto-suave`, `text-secundario`, `border-linea`, y `text-tinta-suave` para texto gris sobre fondos claros). Nada de hex sueltos. `#2563EB` no se usa como color de texto (contraste 3,6:1): para texto azul, `text-secundario`.
6. Fuentes: `font-titulo` (Inter) y `font-texto` (Manrope), cargadas con `next/font`.
7. Accesibilidad: botones reales, `aria-label` en iconos, foco visible, `prefers-reduced-motion`, objetivos táctiles de al menos 44 px.
8. A-Frame u otro 3D **solo en el sitio público**, cargado en el navegador y después del contenido, con imagen de respaldo. Nunca en la app.
9. Comentarios en español y sencillos: dicen para qué sirve cada archivo y por qué, no repiten el código.

## Cómo se trabaja
- Una fase a la vez (ver `docs/plan.md`); no empieces la siguiente sin OK.
- Ramas por fase (`fase-1-reglas`...) y Pull Request a `main`; no se sube directo a `main`.
- Antes de dar algo por terminado: `npm run lint` y `npm run build`. Si algo no se pudo verificar (por ejemplo, contra el Supabase real), dilo claramente.
- Nunca leas, imprimas ni subas `.env*` ni claves. No ejecutes SQL contra la base sin mostrarlo antes.
- Si falta una regla de negocio, **pregunta**; no la inventes (ver preguntas abiertas en `docs/reglas.md`).
- Al empezar una tarea, di en tres líneas: esfuerzo (Alto/Medio/Bajo), modelo recomendado y por qué. Si lo que está seleccionado no coincide, avisa en vez de seguir.
