-- 014 · Cupos completos: calificaciones, seguimiento en vivo y compartir
-- Reglas (docs/reglas.md, "Cupos completos"):
-- - Al terminar un cupo, cada estudiante que viajó (puesto aprobado y pagado)
--   califica al conductor, y el conductor califica a cada uno. Una vez cada uno.
-- - Desde que el conductor sale (cupo en curso) hasta que llega, su ubicación
--   la ven solo él y los estudiantes con el puesto pagado. Se guarda solo la
--   última y se borra al terminar o cancelar el cupo.
-- - Cada estudiante con el puesto pagado puede compartir su viaje con un
--   enlace propio: muestra al conductor, el vehículo, SU recogida y la
--   ubicación en vivo (desde que sale). Se apaga al terminar o cancelar.

-- ---------------------------------------------------------------------------
-- Calificaciones de cupos
-- ---------------------------------------------------------------------------

alter table public.calificaciones alter column viaje_id drop not null;
alter table public.calificaciones add column puesto_id uuid references public.puestos (id) on delete cascade;
alter table public.calificaciones
  add constraint calificacion_de_viaje_o_de_puesto check ((viaje_id is null) <> (puesto_id is null));
alter table public.calificaciones
  add constraint una_calificacion_por_puesto unique (puesto_id, autor_id);

-- Califica a la otra persona de un puesto de un cupo terminado: el
-- estudiante al conductor, o el conductor al estudiante de ese puesto.
create function public.calificar_puesto(p_puesto uuid, p_estrellas integer, p_comentario text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_puesto public.puestos;
  v_cupo public.cupos;
  v_otro uuid;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión primero.';
  end if;
  select * into v_puesto from public.puestos where id = p_puesto;
  select * into v_cupo from public.cupos where id = v_puesto.cupo_id;
  if v_puesto.id is null or auth.uid() not in (v_puesto.estudiante_id, v_cupo.conductor_id) then
    raise exception 'No puedes calificar este viaje.';
  end if;
  if v_cupo.estado <> 'terminado' or v_puesto.estado <> 'aprobado' or v_puesto.pagado <= 0 then
    raise exception 'Solo se califican los cupos terminados en los que viajaron juntos.';
  end if;
  if p_estrellas is null or p_estrellas not between 1 and 5 then
    raise exception 'La calificación va de 1 a 5 estrellas.';
  end if;

  v_otro := case when auth.uid() = v_puesto.estudiante_id then v_cupo.conductor_id else v_puesto.estudiante_id end;
  begin
    insert into public.calificaciones (puesto_id, autor_id, calificado_id, estrellas, comentario)
    values (p_puesto, auth.uid(), v_otro, p_estrellas, left(nullif(btrim(p_comentario), ''), 300));
  exception
    when unique_violation then
      raise exception 'Ya calificaste este viaje.';
  end;
end;
$$;

revoke all on function public.calificar_puesto(uuid, integer, text) from public, anon;
grant execute on function public.calificar_puesto(uuid, integer, text) to authenticated;

-- Los viajes que cuentan en el perfil ahora incluyen los cupos terminados:
-- para el conductor, cada cupo en el que llevó a alguien; para el estudiante,
-- cada puesto pagado de un cupo que llegó.
create or replace function public.perfiles_publicos(p_ids uuid[])
returns table (
  id uuid,
  nombre text,
  rol public.rol_usuario,
  calificacion numeric,
  total_calificaciones integer,
  viajes_terminados integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.nombre,
    p.rol,
    (select round(avg(c.estrellas), 1) from public.calificaciones c where c.calificado_id = p.id),
    (select count(*)::integer from public.calificaciones c where c.calificado_id = p.id),
    (select count(*)::integer from public.viajes v
      where v.estado = 'terminado' and p.id in (v.estudiante_id, v.conductor_id))
    + (select count(*)::integer from public.cupos cu
        where cu.estado = 'terminado' and cu.conductor_id = p.id
          and exists (select 1 from public.puestos pu where pu.cupo_id = cu.id and pu.estado = 'aprobado' and pu.pagado > 0))
    + (select count(*)::integer from public.puestos pu
        join public.cupos cu on cu.id = pu.cupo_id
        where cu.estado = 'terminado' and pu.estudiante_id = p.id and pu.estado = 'aprobado' and pu.pagado > 0)
  from public.perfiles p
  where auth.uid() is not null
    and cardinality(p_ids) <= 50
    and p.id = any (p_ids)
    and p.universidad_id = (select yo.universidad_id from public.perfiles yo where yo.id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Ubicación del conductor en un cupo en curso
-- ---------------------------------------------------------------------------

create table public.ubicaciones_cupo (
  cupo_id uuid primary key references public.cupos (id) on delete cascade,
  conductor_id uuid not null references public.perfiles (id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  precision_m real check (precision_m is null or precision_m >= 0),
  actualizado_en timestamptz not null default now()
);

alter table public.ubicaciones_cupo enable row level security;
revoke insert, update, delete, truncate on public.ubicaciones_cupo from anon, authenticated;
revoke select on public.ubicaciones_cupo from anon;

-- Soy el conductor de este cupo en curso, o voy en él con el puesto pagado.
create function privado.voy_en_cupo_en_curso(p_cupo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.cupos c
    where c.id = p_cupo
      and c.estado = 'en_curso'
      and (
        c.conductor_id = auth.uid()
        or exists (
          select 1 from public.puestos p
          where p.cupo_id = c.id and p.estudiante_id = auth.uid() and p.estado = 'aprobado' and p.pagado > 0
        )
      )
  );
$$;

revoke all on function privado.voy_en_cupo_en_curso(uuid) from public, anon;
grant execute on function privado.voy_en_cupo_en_curso(uuid) to authenticated;

create policy "ubicaciones de cupo: las del cupo en curso propio" on public.ubicaciones_cupo for select to authenticated
  using (privado.voy_en_cupo_en_curso(cupo_id));

create function public.reportar_ubicacion_cupo(
  p_cupo uuid, p_lat double precision, p_lng double precision, p_precision real default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cupo public.cupos;
  v_ultima timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión primero.';
  end if;
  select * into v_cupo from public.cupos where id = p_cupo;
  if v_cupo.id is null or v_cupo.conductor_id is distinct from auth.uid() or v_cupo.estado <> 'en_curso' then
    raise exception 'Este cupo no está en camino.';
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180
     or (p_precision is not null and p_precision < 0) then
    raise exception 'La ubicación no es válida.';
  end if;

  select actualizado_en into v_ultima from public.ubicaciones_cupo where cupo_id = p_cupo;
  if v_ultima is not null and v_ultima > now() - interval '4 seconds' then
    return;
  end if;

  insert into public.ubicaciones_cupo (cupo_id, conductor_id, lat, lng, precision_m, actualizado_en)
  values (p_cupo, auth.uid(), p_lat, p_lng, p_precision, now())
  on conflict (cupo_id) do update
    set lat = excluded.lat, lng = excluded.lng, precision_m = excluded.precision_m, actualizado_en = excluded.actualizado_en;
end;
$$;

revoke all on function public.reportar_ubicacion_cupo(uuid, double precision, double precision, real) from public, anon;
grant execute on function public.reportar_ubicacion_cupo(uuid, double precision, double precision, real) to authenticated;

create function privado.borrar_ubicacion_de_cupo_al_cerrar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.estado in ('terminado', 'cancelado') and old.estado is distinct from new.estado then
    delete from public.ubicaciones_cupo where cupo_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function privado.borrar_ubicacion_de_cupo_al_cerrar() from public, anon, authenticated;

create trigger borrar_ubicacion_de_cupo_al_cerrar
  after update of estado on public.cupos
  for each row execute function privado.borrar_ubicacion_de_cupo_al_cerrar();

-- ---------------------------------------------------------------------------
-- Compartir el viaje de un puesto
-- ---------------------------------------------------------------------------

create table public.enlaces_puesto (
  token text primary key check (token ~ '^[0-9a-f]{64}$'),
  puesto_id uuid not null unique references public.puestos (id) on delete cascade,
  creado_por uuid not null references public.perfiles (id) on delete cascade,
  creado_en timestamptz not null default now()
);

-- Nadie la lee directamente: solo con las funciones de abajo.
alter table public.enlaces_puesto enable row level security;
revoke all on public.enlaces_puesto from anon, authenticated;

-- El estudiante pide el enlace de su puesto pagado (siempre el mismo).
create function public.compartir_puesto(p_cupo uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cupo public.cupos;
  v_puesto public.puestos;
  v_token text;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión primero.';
  end if;
  select * into v_cupo from public.cupos where id = p_cupo;
  select * into v_puesto from public.puestos where cupo_id = p_cupo and estudiante_id = auth.uid();
  if v_cupo.id is null or v_puesto.id is null then
    raise exception 'No tienes puesto en este cupo.';
  end if;
  if v_cupo.estado not in ('publicado', 'en_curso') or v_puesto.estado <> 'aprobado' or v_puesto.pagado <= 0 then
    raise exception 'Puedes compartir el viaje cuando tu puesto esté pagado.';
  end if;

  select token into v_token from public.enlaces_puesto where puesto_id = v_puesto.id;
  if v_token is null then
    v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    insert into public.enlaces_puesto (token, puesto_id, creado_por) values (v_token, v_puesto.id, auth.uid())
    on conflict (puesto_id) do nothing;
    select token into v_token from public.enlaces_puesto where puesto_id = v_puesto.id;
  end if;
  return v_token;
end;
$$;

revoke all on function public.compartir_puesto(uuid) from public, anon;
grant execute on function public.compartir_puesto(uuid) to authenticated;

-- Lo que ve quien abre el enlace de un puesto. Sin token válido no devuelve
-- nada; con el cupo cerrado (o el puesto perdido) solo el estado.
create function public.cupo_compartido(p_token text)
returns table (
  estado public.estado_cupo,
  activo boolean,
  sale_en timestamptz,
  recogida_texto text,
  destino_texto text,
  recogida_lat double precision,
  recogida_lng double precision,
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
    c.estado,
    a.activo,
    case when a.activo then c.sale_en end,
    case when a.activo then pu.recogida_texto end,
    case when a.activo then c.destino_texto end,
    case when a.activo then pu.recogida_lat end,
    case when a.activo then pu.recogida_lng end,
    case when a.activo then c.destino_lat end,
    case when a.activo then c.destino_lng end,
    case when a.activo then privado.nombre_corto(pe.nombre) end,
    case when a.activo then privado.nombre_corto(pc.nombre) end,
    case when a.activo then nullif(btrim(concat_ws(' ', ve.marca, ve.modelo, ve.color)), '') end,
    case when a.activo then ve.placa end,
    case when a.activo then u.lat end,
    case when a.activo then u.lng end,
    case when a.activo then u.actualizado_en end
  from public.enlaces_puesto e
  join public.puestos pu on pu.id = e.puesto_id
  join public.cupos c on c.id = pu.cupo_id
  cross join lateral (select c.estado in ('publicado', 'en_curso') and pu.estado = 'aprobado' as activo) a
  left join public.perfiles pe on pe.id = pu.estudiante_id
  left join public.perfiles pc on pc.id = c.conductor_id
  left join public.vehiculos ve on ve.conductor_id = c.conductor_id
  left join public.ubicaciones_cupo u on u.cupo_id = c.id
  where p_token ~ '^[0-9a-f]{64}$' and e.token = p_token;
$$;

revoke all on function public.cupo_compartido(text) from public;
grant execute on function public.cupo_compartido(text) to anon, authenticated;

alter publication supabase_realtime add table public.ubicaciones_cupo;
