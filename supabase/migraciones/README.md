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

## Aplicar en Supabase (cuando exista el proyecto)
1. Panel de Supabase → SQL Editor → pegar y ejecutar cada archivo **en orden**, uno por uno. No ejecutes nada de `supabase/pruebas/`.
2. Authentication → Providers → Email: dejar activado **Confirm email**, para que solo entre quien de verdad tiene el correo institucional.
3. Revisar en Database → Tables que todas digan "RLS enabled".
