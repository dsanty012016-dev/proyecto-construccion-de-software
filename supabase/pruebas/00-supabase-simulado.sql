-- Imita lo mínimo de Supabase (roles, auth.users, auth.uid() y permisos por
-- defecto) para correr las migraciones en un Postgres normal y probarlas.
-- SOLO para pruebas: nunca se ejecuta en el proyecto real de Supabase.

-- Los roles son de todo el servidor: se crean solo si no existen.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end;
$$;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb,
  created_at timestamptz not null default now()
);

-- En Supabase, auth.uid() sale del token de la sesión.
create function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

-- Supabase da por defecto todos los permisos sobre "public" a estos roles;
-- por eso las migraciones quitan lo que no corresponde y usan RLS.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
