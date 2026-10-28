# UniGo · Tu viaje, tu universidad

App web instalable (PWA) de movilidad para estudiantes de la Universidad Santo Tomás, seccional Villavicencio. Estudiantes y conductores de la misma universidad comparten el viaje a la U y de regreso: por pedido (los conductores ofertan su precio) o en cupos con hora fija. Proyecto académico de Dilan Santiago Chavarro Parra y David Eduardo Durán Acevedo.

**En línea:** https://unigoproject.vercel.app (se publica solo con cada merge a `main`).

**Para el profesor:** [`docs/entrega.md`](docs/entrega.md) resume qué hace, cómo está construida, la seguridad, las pruebas y lo pendiente.

## Qué incluye
- Registro solo con correo @ustavillavo.edu.co, confirmación por correo y política de privacidad (Ley 1581).
- Viajes por pedido con ofertas en tiempo real, ida y regreso, seguimiento en vivo y "compartir viaje".
- Cupos con hora fija: puestos, aprobación, pago, orden de recogida o de bajada.
- Verificación de conductores (documentos revisados por un administrador).
- Billetera simulada, comisión del 10 %, cancelaciones, strikes y suspensiones.
- Solicitudes y cupos que vencen solos.
- Notificaciones en el celular, instalación como app y pantalla sin conexión.

## Cómo correrlo en el computador
Requiere Node 22 o superior.

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm test         # pruebas de las reglas (Vitest)
npm run build
```

Las variables de entorno van en `.env.local` (nunca se sube) y, para producción, en Vercel (Settings → Environment Variables). `.env.example` lista sus nombres, sin valores.

Las pruebas de la base de datos corren en GitHub en cada subida; para correrlas en local, ver `supabase/migraciones/README.md`.

## Documentación
- [`docs/entrega.md`](docs/entrega.md): documento de entrega (resumen completo).
- [`AGENTS.md`](AGENTS.md): reglas de código y organización.
- [`docs/reglas.md`](docs/reglas.md): reglas del viaje, cupos, billetera, vencimientos y notificaciones.
- [`docs/plan.md`](docs/plan.md): fases del trabajo y avance.
- [`docs/seguridad.md`](docs/seguridad.md): revisión de seguridad.
- [`docs/supabase-auth.md`](docs/supabase-auth.md): configuración de inicio de sesión y correos.
- [`docs/notificaciones.md`](docs/notificaciones.md): configuración de las notificaciones.
- [`docs/identidad.md`](docs/identidad.md): colores, tipografía y logos. `docs/diseno/`: mockups.
- `supabase/migraciones/`: base de datos (001 a 020). `supabase/pruebas/`: sus pruebas. `supabase/functions/`: envío de notificaciones.
- `docs/landing-original/`: la landing en HTML del equipo, conservada como referencia.

## Stack
Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Realtime, Storage, Edge Functions) · MapLibre + OpenFreeMap · A-Frame · Vercel.
