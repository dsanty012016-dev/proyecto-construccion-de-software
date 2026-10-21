# Migraciones de Supabase

Todo cambio en la base de datos (tablas, políticas RLS, funciones) se escribe aquí como un script SQL numerado y se ejecuta en orden:

```
001-perfiles.sql
002-viajes.sql
...
```

Reglas: nunca editar un script ya ejecutado (se crea uno nuevo que lo corrija), y toda tabla nueva lleva `alter table ... enable row level security` y sus políticas en el mismo script.
