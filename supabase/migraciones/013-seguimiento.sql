-- 013 · Seguimiento en vivo del conductor y "Compartir viaje"
-- Reglas (docs/reglas.md, fase 4 parte 2):
-- - Mientras el viaje está aceptado o en curso, el conductor envía su
--   ubicación cada 5 segundos. Solo se guarda la última (una fila por viaje)
--   y se borra cuando el viaje termina o se cancela.
-- - La ven solo el estudiante y el conductor de ese viaje (RLS, también en
--   tiempo real).
-- - El estudiante puede crear un enlace para compartir el viaje: quien lo
--   tenga lo ve sin iniciar sesión (nombres cortos, vehículo y ubicación, sin
--   teléfonos). El enlace deja de mostrar el viaje cuando termina o se cancela.

-- ---------------------------------------------------------------------------
-- Ubicación del conductor
-- ---------------------------------------------------------------------------

create table public.ubicaciones_viaje (
  viaje_id uuid primary key references public.viajes (id) on delete cascade,
  conductor_id uuid not null references public.perfiles (id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  -- Precisión del GPS en metros, si el teléfono la da.
  precision_m real check (precision_m is null or precision_m >= 0),
  actualizado_en timestamptz not null default now()
);

alter table public.ubicaciones_viaje enable row level security;
revoke insert, update, delete, truncate on public.ubicaciones_viaje from anon, authenticated;
revoke select on public.ubicaciones_viaje from anon;

-- Soy el estudiante o el conductor de este viaje y sigue activo.
create function privado.participo_en_viaje_activo(p_viaje uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.viajes v
    where v.id = p_viaje
      and v.estado in ('aceptado', 'en_curso')
      and auth.uid() in (v.estudiante_id, v.conductor_id)
  );
$$;

revoke all on function privado.participo_en_viaje_activo(uuid) from public, anon;
grant execute on function privado.participo_en_viaje_activo(uuid) to authenticated;

create policy "ubicaciones: las del viaje activo propio" on public.ubicaciones_viaje for select to authenticated
  using (privado.participo_en_viaje_activo(viaje_id));

-- El conductor reporta dónde está. Si llega antes de 4 segundos desde la
-- última, se ignora sin error (el teléfono puede mandar de más).
create function public.reportar_ubicacion(
  p_viaje uuid, p_lat double precision, p_lng double precision, p_precision real default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_viaje public.viajes;
  v_ultima timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión primero.';
  end if;
  select * into v_viaje from public.viajes where id = p_viaje;
  if v_viaje.id is null or v_viaje.conductor_id is distinct from auth.uid()
     or v_viaje.estado not in ('aceptado', 'en_curso') then
    raise exception 'Este viaje ya no está activo.';
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180
     or (p_precision is not null and p_precision < 0) then
    raise exception 'La ubicación no es válida.';
  end if;

  select actualizado_en into v_ultima from public.ubicaciones_viaje where viaje_id = p_viaje;
  if v_ultima is not null and v_ultima > now() - interval '4 seconds' then
    return;
  end if;

  insert into public.ubicaciones_viaje (viaje_id, conductor_id, lat, lng, precision_m, actualizado_en)
  values (p_viaje, auth.uid(), p_lat, p_lng, p_precision, now())
  on conflict (viaje_id) do update
    set lat = excluded.lat, lng = excluded.lng, precision_m = excluded.precision_m, actualizado_en = excluded.actualizado_en;
end;
$$;

revoke all on function public.reportar_ubicacion(uuid, double precision, double precision, real) from public, anon;
grant execute on function public.reportar_ubicacion(uuid, double precision, double precision, real) to authenticated;

-- Al terminar o cancelar el viaje, la ubicación se borra (privacidad).
create function privado.borrar_ubicacion_al_cerrar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.estado in ('terminado', 'cancelado') and old.estado is distinct from new.estado then
    delete from public.ubicaciones_viaje where viaje_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function privado.borrar_ubicacion_al_cerrar() from public, anon, authenticated;

create trigger borrar_ubicacion_al_cerrar
  after update of estado on public.viajes
  for each row execute function privado.borrar_ubicacion_al_cerrar();

-- ---------------------------------------------------------------------------
-- Compartir viaje
-- ---------------------------------------------------------------------------

create table public.enlaces_viaje (
  -- 64 caracteres hexadecimales al azar: imposible de adivinar.
  token text primary key check (token ~ '^[0-9a-f]{64}$'),
  viaje_id uuid not null unique references public.viajes (id) on delete cascade,
  creado_por uuid not null references public.perfiles (id) on delete cascade,
  creado_en timestamptz not null default now()
);

-- Nadie lee esta tabla directamente: solo con las funciones de abajo.
alter table public.enlaces_viaje enable row level security;
revoke all on public.enlaces_viaje from anon, authenticated;

-- El estudiante pide el enlace de su viaje aceptado o en curso (siempre el mismo).
create function public.compartir_viaje(p_viaje uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_viaje public.viajes;
  v_token text;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión primero.';
  end if;
  select * into v_viaje from public.viajes where id = p_viaje;
  if v_viaje.id is null or v_viaje.estudiante_id is distinct from auth.uid() then
    raise exception 'Ese viaje no existe.';
  end if;
  if v_viaje.estado not in ('aceptado', 'en_curso') then
    raise exception 'Puedes compartir el viaje cuando un conductor lo acepte.';
  end if;

  select token into v_token from public.enlaces_viaje where viaje_id = p_viaje;
  if v_token is null then
    v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    insert into public.enlaces_viaje (token, viaje_id, creado_por) values (v_token, p_viaje, auth.uid())
    on conflict (viaje_id) do nothing;
    select token into v_token from public.enlaces_viaje where viaje_id = p_viaje;
  end if;
  return v_token;
end;
$$;

revoke all on function public.compartir_viaje(uuid) from public, anon;
grant execute on function public.compartir_viaje(uuid) to authenticated;

-- "Ana Rojas Pérez" → "Ana P." (lo mismo que nombreCorto en app/lib/formato.ts).
create function privado.nombre_corto(p_nombre text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when btrim(coalesce(p_nombre, '')) = '' then ''
    when btrim(p_nombre) !~ '\s' then btrim(p_nombre)
    else split_part(btrim(p_nombre), ' ', 1) || ' ' || upper(left(regexp_replace(btrim(p_nombre), '^.*\s', ''), 1)) || '.'
  end;
$$;

revoke all on function privado.nombre_corto(text) from public;
grant execute on function privado.nombre_corto(text) to anon, authenticated;

-- Lo que ve quien abre el enlace. Sin token válido no devuelve nada; con el
-- viaje ya cerrado devuelve solo el estado, para decir "este viaje terminó".
create function public.viaje_compartido(p_token text)
returns table (
  estado public.estado_viaje,
  origen_texto text,
  destino_texto text,
  origen_lat double precision,
  origen_lng double precision,
  destino_lat double precision,
  destino_lng double precision,
  estudiante text,
  conductor text,
  vehiculo text,
  placa text,
  ubicacion_lat double precision,
  ubicacion_lng double precision,
  ubicacion_en timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    v.estado,
    case when activo then v.origen_texto end,
    case when activo then v.destino_texto end,
    case when activo then v.origen_lat end,
    case when activo then v.origen_lng end,
    case when activo then v.destino_lat end,
    case when activo then v.destino_lng end,
    case when activo then privado.nombre_corto(pe.nombre) end,
    case when activo then privado.nombre_corto(pc.nombre) end,
    case when activo then nullif(btrim(concat_ws(' ', ve.marca, ve.modelo, ve.color)), '') end,
    case when activo then ve.placa end,
    case when activo then u.lat end,
    case when activo then u.lng end,
    case when activo then u.actualizado_en end
  from public.enlaces_viaje e
  join public.viajes v on v.id = e.viaje_id
  cross join lateral (select v.estado in ('aceptado', 'en_curso') as activo) a
  left join public.perfiles pe on pe.id = v.estudiante_id
  left join public.perfiles pc on pc.id = v.conductor_id
  left join public.vehiculos ve on ve.conductor_id = v.conductor_id
  left join public.ubicaciones_viaje u on u.viaje_id = v.id
  where p_token ~ '^[0-9a-f]{64}$' and e.token = p_token;
$$;

revoke all on function public.viaje_compartido(text) from public;
grant execute on function public.viaje_compartido(text) to anon, authenticated;

-- La ubicación llega en vivo al estudiante (Realtime respeta la política de arriba).
alter publication supabase_realtime add table public.ubicaciones_viaje;
