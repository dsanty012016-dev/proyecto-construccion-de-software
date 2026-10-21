-- 011 · Verificación del conductor
-- Decisión del equipo (docs/reglas.md, fase 4e): para conducir hay que subir
-- cédula, licencia de conducción y tarjeta de propiedad; un administrador los
-- revisa a mano y, hasta que los tres estén aprobados, el conductor no puede
-- ponerse disponible, ofertar ni publicar cupos.
--
-- Datos sensibles (Ley 1581 de 2012): los archivos viven en un bucket PRIVADO
-- de Supabase Storage; los ven solo su dueño y los administradores. La tabla
-- guarda la ruta del archivo, el estado de la revisión y la fecha en que el
-- conductor autorizó el tratamiento de sus datos.

create type public.tipo_documento as enum ('cedula', 'licencia', 'tarjeta_propiedad');
create type public.estado_documento as enum ('pendiente', 'aprobado', 'rechazado');

-- Administradores: no se puede cambiar desde la app (las columnas editables
-- de perfiles siguen siendo solo nombre y teléfono, ver 002).
alter table public.perfiles add column es_admin boolean not null default false;

create table public.documentos_conductor (
  id uuid primary key default gen_random_uuid(),
  conductor_id uuid not null references public.perfiles (id) on delete cascade,
  tipo public.tipo_documento not null,
  -- Ruta dentro del bucket "documentos": <id del conductor>/<archivo>.
  ruta text not null check (ruta ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,100}$'),
  estado public.estado_documento not null default 'pendiente',
  motivo text check (motivo is null or char_length(motivo) <= 300),
  autorizado_en timestamptz not null,
  enviado_en timestamptz not null default now(),
  revisado_en timestamptz,
  revisado_por uuid references public.perfiles (id),
  unique (conductor_id, tipo),
  constraint ruta_en_su_carpeta check (split_part(ruta, '/', 1) = conductor_id::text)
);

create index documentos_pendientes on public.documentos_conductor (enviado_en) where estado = 'pendiente';

alter table public.documentos_conductor enable row level security;
revoke insert, update, delete, truncate on public.documentos_conductor from anon, authenticated;
revoke select on public.documentos_conductor from anon;

-- ---------------------------------------------------------------------------
-- Funciones de ayuda
-- ---------------------------------------------------------------------------

create function privado.soy_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and es_admin);
$$;

create function privado.conductor_verificado(p_conductor uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (
    select count(*) from public.documentos_conductor
    where conductor_id = p_conductor and estado = 'aprobado'
  ) = 3;
$$;

-- Si deja de estar verificado: no disponible y sin ofertas activas.
create function privado.al_perder_verificacion(p_conductor uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if privado.conductor_verificado(p_conductor) then
    return;
  end if;
  update public.perfiles set disponible = false where id = p_conductor and disponible;
  update public.ofertas set estado = 'retirada' where conductor_id = p_conductor and estado = 'activa';
end;
$$;

revoke all on function privado.soy_admin() from public, anon;
revoke all on function privado.conductor_verificado(uuid) from public, anon;
revoke all on function privado.al_perder_verificacion(uuid) from public, anon, authenticated;
grant execute on function privado.soy_admin() to authenticated;
grant execute on function privado.conductor_verificado(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Lectura
-- ---------------------------------------------------------------------------

create policy "documentos: el conductor y los administradores"
  on public.documentos_conductor for select
  to authenticated
  using (conductor_id = (select auth.uid()) or privado.soy_admin());

-- Para revisar, el administrador ve el perfil y el vehículo de los conductores.
create policy "perfiles: los administradores"
  on public.perfiles for select
  to authenticated
  using (privado.soy_admin());

create policy "vehiculos: los administradores"
  on public.vehiculos for select
  to authenticated
  using (privado.soy_admin());

-- ---------------------------------------------------------------------------
-- Funciones RPC
-- ---------------------------------------------------------------------------

-- El conductor registra un documento que ya subió al bucket. Volver a enviarlo
-- lo deja otra vez en revisión.
create function public.enviar_documento(p_tipo public.tipo_documento, p_ruta text, p_autorizo boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo public.perfiles := privado.mi_perfil();
begin
  if v_yo.id is null then
    raise exception 'Inicia sesión primero.';
  end if;
  if v_yo.rol is distinct from 'conductor' then
    raise exception 'Cambia a modo conductor para subir tus documentos.';
  end if;
  if p_autorizo is not true then
    raise exception 'Debes autorizar el tratamiento de tus datos para continuar.';
  end if;
  if p_tipo is null then
    raise exception 'Elige qué documento estás subiendo.';
  end if;
  begin
    insert into public.documentos_conductor (conductor_id, tipo, ruta, autorizado_en)
    values (v_yo.id, p_tipo, p_ruta, now())
    on conflict (conductor_id, tipo) do update
      set ruta = excluded.ruta, estado = 'pendiente', motivo = null,
          autorizado_en = now(), enviado_en = now(), revisado_en = null, revisado_por = null;
  exception
    when check_violation or not_null_violation then
      raise exception 'Ese archivo no es válido. Vuelve a subirlo.';
  end;
  perform privado.al_perder_verificacion(v_yo.id);
end;
$$;

create function public.revisar_documento(p_documento uuid, p_aprobar boolean, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc public.documentos_conductor;
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
begin
  if not privado.soy_admin() then
    raise exception 'Solo un administrador puede revisar documentos.';
  end if;
  select * into v_doc from public.documentos_conductor where id = p_documento for update;
  if v_doc.id is null then
    raise exception 'Ese documento no existe.';
  end if;
  if v_doc.conductor_id = auth.uid() then
    raise exception 'No puedes revisar tus propios documentos.';
  end if;
  if v_doc.estado <> 'pendiente' then
    raise exception 'Ese documento ya fue revisado.';
  end if;
  if p_aprobar is not true and v_motivo is null then
    raise exception 'Escribe el motivo del rechazo.';
  end if;

  update public.documentos_conductor
  set estado = case when p_aprobar then 'aprobado'::public.estado_documento else 'rechazado'::public.estado_documento end,
      motivo = case when p_aprobar then null else left(v_motivo, 300) end,
      revisado_en = now(),
      revisado_por = auth.uid()
  where id = p_documento;

  perform privado.al_perder_verificacion(v_doc.conductor_id);
end;
$$;

revoke all on function public.enviar_documento(public.tipo_documento, text, boolean) from public, anon;
revoke all on function public.revisar_documento(uuid, boolean, text) from public, anon;
grant execute on function public.enviar_documento(public.tipo_documento, text, boolean) to authenticated;
grant execute on function public.revisar_documento(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Bloqueos: sin verificación no hay disponibilidad ni cupos
-- ---------------------------------------------------------------------------

-- Igual a la de 003, más la verificación al ponerse disponible.
create or replace function public.cambiar_disponibilidad(p_disponible boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión primero.';
  end if;
  if not privado.soy_conductor() then
    raise exception 'Solo los conductores pueden ponerse disponibles.';
  end if;
  if p_disponible and not exists (
    select 1 from public.vehiculos v where v.conductor_id = auth.uid()
  ) then
    raise exception 'Registra tu vehículo antes de ponerte disponible.';
  end if;
  if p_disponible and not privado.conductor_verificado(auth.uid()) then
    raise exception 'Tus documentos aún no están aprobados.';
  end if;

  update public.perfiles set disponible = p_disponible where id = auth.uid();

  if not p_disponible then
    update public.ofertas o set estado = 'retirada'
    from public.viajes v
    where o.viaje_id = v.id
      and o.conductor_id = auth.uid()
      and o.estado = 'activa'
      and v.estado = 'solicitado';
  end if;
end;
$$;

create function privado.revisar_verificacion_al_publicar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not privado.conductor_verificado(new.conductor_id) then
    raise exception 'Tus documentos aún no están aprobados.';
  end if;
  return new;
end;
$$;

revoke all on function privado.revisar_verificacion_al_publicar() from public, anon, authenticated;

create trigger verificado_al_publicar_cupo
  before insert on public.cupos
  for each row execute function privado.revisar_verificacion_al_publicar();

-- Si cambia la placa, la tarjeta de propiedad vuelve a revisión.
create function privado.al_cambiar_placa()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.documentos_conductor
  set estado = 'pendiente', motivo = 'Cambiaste la placa del vehículo.', revisado_en = null, revisado_por = null
  where conductor_id = new.conductor_id and tipo = 'tarjeta_propiedad' and estado <> 'pendiente';
  perform privado.al_perder_verificacion(new.conductor_id);
  return new;
end;
$$;

revoke all on function privado.al_cambiar_placa() from public, anon, authenticated;

create trigger tarjeta_a_revision_al_cambiar_placa
  after update of placa on public.vehiculos
  for each row
  when (old.placa is distinct from new.placa)
  execute function privado.al_cambiar_placa();

-- Los conductores que ya estaban activos quedan sin disponibilidad hasta verificarse.
update public.ofertas o set estado = 'retirada'
where o.estado = 'activa' and not privado.conductor_verificado(o.conductor_id);
update public.perfiles set disponible = false
where disponible and not privado.conductor_verificado(id);

-- ---------------------------------------------------------------------------
-- Almacenamiento privado (solo existe en Supabase; las pruebas locales lo saltan)
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('documentos', 'documentos', false, 5242880,
            array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
    on conflict (id) do nothing;

    execute $p$
      create policy "documentos: cada conductor sube a su carpeta"
        on storage.objects for insert
        to authenticated
        with check (
          bucket_id = 'documentos'
          and (storage.foldername(name))[1] = (select auth.uid())::text
        )
    $p$;

    execute $p$
      create policy "documentos: el dueño y los administradores los ven"
        on storage.objects for select
        to authenticated
        using (
          bucket_id = 'documentos'
          and ((storage.foldername(name))[1] = (select auth.uid())::text or privado.soy_admin())
        )
    $p$;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Administradores del equipo
-- ---------------------------------------------------------------------------

update public.perfiles p set es_admin = true
from auth.users u
where u.id = p.id
  and lower(u.email) in ('davidduran@ustavillavo.edu.co', 'dilan.chavarro@ustavillavo.edu.co');
