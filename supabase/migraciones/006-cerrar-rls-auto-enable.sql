-- 006 · Cerrar rls_auto_enable()
-- Supabase crea esta función cuando se activa "RLS automático" al crear el
-- proyecto. Quedaba expuesta por la API (incluso sin sesión). Postgres la
-- sigue ejecutando sola en cada tabla nueva; solo se quita el permiso público.
-- Ya aplicada en el proyecto Unigo. Si la función no existe, no hace nada.
do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
