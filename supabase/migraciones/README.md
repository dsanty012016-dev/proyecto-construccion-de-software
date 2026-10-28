# Migraciones de Supabase

Todo cambio en la base de datos (tablas, políticas RLS, funciones) se escribe aquí como un script SQL numerado y se ejecuta en orden:

| Archivo | Qué crea |
|---|---|
| `001-universidades.sql` | Universidades (dominio de correo permitido) y el esquema `privado` |
| `002-perfiles.sql` | Perfiles, trigger que crea el perfil y filtra el correo, `elegir_rol` |
| `003-vehiculos.sql` | Vehículos y `cambiar_disponibilidad` |
| `004-viajes.sql` | Viajes, ofertas y sus funciones (`solicitar_viaje`, `ofertar`, `retirar_oferta`, `aceptar_oferta`, `iniciar_viaje`, `terminar_viaje`, `cancelar_viaje`) |
| `005-calificaciones.sql` | Calificaciones, `calificar` y `perfiles_publicos` |
| `006-cerrar-rls-auto-enable.sql` | Quita el permiso público a una función que crea Supabase |
| `007-ubicacion-sede.sql` | Coordenadas de la sede de la Santo Tomás (destino de los viajes) |
| `008-tiempo-real.sql` | Viajes y ofertas en Supabase Realtime (respeta RLS) |
| `009-cambio-de-modo.sql` | `cambiar_modo`: la misma cuenta pasa de estudiante a conductor y al revés |
| `010-cupos.sql` | Cupos publicados por el conductor y puestos que piden los estudiantes (con aprobación) |
| `011-verificacion-conductor.sql` | Documentos del conductor (bucket privado), administradores y bloqueo hasta aprobarlos |
| `012-billetera.sql` | Billetera simulada, pagos retenidos, cobros por cancelación, strikes y suspensiones |
| `013-seguimiento.sql` | Ubicación en vivo del conductor y enlaces para compartir el viaje |
| `014-cupos-completos.sql` | Cupos: calificaciones, seguimiento en vivo, compartir por estudiante y orden de recogida |
| `015-revision-seguridad.sql` | Correcciones de la revisión de seguridad (ver `docs/seguridad.md`) |
| `016-politica-privacidad.sql` | Aceptación de la política de privacidad (versión y fecha) |
| `017-viaje-de-regreso.sql` | Sentido ida/regreso en viajes y cupos, punto en la U a máximo 500 m de la sede |
| `018-vencimientos.sql` | Solicitudes y cupos que se cancelan solos (pg_cron cada minuto) |
| `019-notificaciones.sql` | Suscripciones del celular, avisos por evento y llamada a la función `enviar-avisos` (pg_net) |
| `020-mantener-avisos.sql` | Reintento cada 2 minutos y limpieza de avisos viejos |

## Reglas
- Nunca editar un script ya ejecutado en Supabase: se crea uno nuevo que lo corrija.
- Toda tabla nueva lleva `enable row level security` y sus políticas en el mismo script.
- Las tablas de viajes no se escriben directo: solo con las funciones RPC (`security definer`, `search_path` vacío).
- Cada cambio lleva su prueba en `supabase/pruebas/pruebas.sql`.

## Probar sin tocar Supabase
`supabase/pruebas/correr.sh` corre todo en un Postgres **vacío** que imita lo mínimo de Supabase (roles, `auth.users`, `auth.uid()`). GitHub lo corre en cada subida (job `base-de-datos`). Localmente, con Docker:

```bash
docker run -d --name unigo-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:17
PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres ./supabase/pruebas/correr.sh
```

## Aplicar en Supabase
El proyecto Unigo de Supabase ya tiene aplicadas las migraciones hasta la última que se haya fusionado. Para un proyecto nuevo:
1. Panel de Supabase → SQL Editor → pegar y ejecutar cada archivo **en orden**, uno por uno. No ejecutes nada de `supabase/pruebas/`.
2. Authentication → Providers → Email: dejar activado **Confirm email**, para que solo entre quien de verdad tiene el correo institucional.
3. Revisar en Database → Tables que todas digan "RLS enabled".
