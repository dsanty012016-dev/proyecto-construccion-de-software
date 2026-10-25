-- 001 · Universidades y esquema privado
-- Las universidades definen qué correos pueden registrarse (dominio_correo) y a
-- dónde van los viajes. Por ahora solo la USTA de Villavicencio.
--
-- El esquema "privado" guarda funciones de ayuda para las políticas RLS; no se
-- expone por la API de Supabase (solo "public" se expone).

create schema if not exists privado;
grant usage on schema privado to authenticated;

create table public.universidades (
  id smallint generated always as identity primary key,
  nombre text not null unique,
  ciudad text not null,
  -- Sin "@" y en minúsculas, por ejemplo: ustavillavo.edu.co
  dominio_correo text not null unique
    check (dominio_correo ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$'),
  -- Punto de llegada por defecto en el mapa. Pendiente de llenar en la fase 4
  -- con la ubicación verificada de la sede.
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  activa boolean not null default true,
  creada_en timestamptz not null default now()
);

alter table public.universidades enable row level security;

-- La lista de universidades es pública (la usa también el sitio y el registro).
create policy "universidades: cualquiera ve las activas"
  on public.universidades for select
  to anon, authenticated
  using (activa);

-- Nadie las cambia desde la app; solo desde el panel o una migración.
revoke insert, update, delete, truncate on public.universidades from anon, authenticated;

insert into public.universidades (nombre, ciudad, dominio_correo)
values ('Universidad Santo Tomás, seccional Villavicencio', 'Villavicencio', 'ustavillavo.edu.co');
