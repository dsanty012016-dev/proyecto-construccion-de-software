-- 004 · Viajes y ofertas
-- Las mismas reglas de app/lib/viaje.ts, pero aquí son las que mandan:
--   solicitado → aceptado → en_curso → terminado, y cancelado desde
--   solicitado (lo cancela el estudiante) o aceptado (cualquiera de los dos).
-- Los conductores disponibles ofertan su precio; el estudiante elige una oferta.
-- Nadie escribe directo en estas tablas: todo pasa por las funciones RPC de
-- abajo, que validan quién hace qué y en qué estado.

create type public.estado_viaje as enum
  ('solicitado', 'aceptado', 'en_curso', 'terminado', 'cancelado');

create type public.estado_oferta as enum
  ('activa', 'retirada', 'aceptada', 'rechazada');

create table public.viajes (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references public.perfiles (id),
  universidad_id smallint not null references public.universidades (id),

  origen_lat double precision not null check (origen_lat between -90 and 90),
  origen_lng double precision not null check (origen_lng between -180 and 180),
  origen_texto text not null check (char_length(btrim(origen_texto)) between 1 and 200),
  destino_lat double precision not null check (destino_lat between -90 and 90),
  destino_lng double precision not null check (destino_lng between -180 and 180),
  destino_texto text not null check (char_length(btrim(destino_texto)) between 1 and 200),

  estado public.estado_viaje not null default 'solicitado',
  conductor_id uuid references public.perfiles (id),
  -- Pesos colombianos. Mismos límites que PRECIO_MINIMO y PRECIO_MAXIMO.
  precio integer check (precio between 1000 and 100000),

  creado_en timestamptz not null default now(),
  aceptado_en timestamptz,
  iniciado_en timestamptz,
  terminado_en timestamptz,
  cancelado_en timestamptz,
  cancelado_por uuid references public.perfiles (id),

  constraint conductor_no_es_el_estudiante
    check (conductor_id is null or conductor_id <> estudiante_id),
  constraint origen_distinto_de_destino
    check (not (origen_lat = destino_lat and origen_lng = destino_lng)),
  constraint datos_segun_estado check (
    case estado
      when 'solicitado' then conductor_id is null and precio is null
      when 'aceptado' then conductor_id is not null and precio is not null and aceptado_en is not null
      when 'en_curso' then conductor_id is not null and iniciado_en is not null
      when 'terminado' then conductor_id is not null and terminado_en is not null
      when 'cancelado' then cancelado_en is not null and cancelado_por is not null
    end
  )
);

-- Un estudiante tiene a lo sumo un viaje activo, y un conductor lleva a lo
-- sumo un viaje a la vez. Lo garantiza la base aunque lleguen dos clics juntos.
create unique index viajes_un_activo_por_estudiante
  on public.viajes (estudiante_id)
  where estado in ('solicitado', 'aceptado', 'en_curso');

create unique index viajes_un_activo_por_conductor
  on public.viajes (conductor_id)
  where estado in ('aceptado', 'en_curso');

create index viajes_solicitados on public.viajes (universidad_id, creado_en)
  where estado = 'solicitado';

create table public.ofertas (
  id uuid primary key default gen_random_uuid(),
  viaje_id uuid not null references public.viajes (id) on delete cascade,
  conductor_id uuid not null references public.perfiles (id),
  precio integer not null check (precio between 1000 and 100000),
  estado public.estado_oferta not null default 'activa',
  creada_en timestamptz not null default now(),
  -- Una oferta por conductor y viaje; si vuelve a ofertar se actualiza.
  unique (viaje_id, conductor_id)
);

create index ofertas_por_conductor on public.ofertas (conductor_id) where estado = 'activa';

alter table public.viajes enable row level security;
alter table public.ofertas enable row level security;

revoke insert, update, delete, truncate on public.viajes from anon, authenticated;
revoke insert, update, delete, truncate on public.ofertas from anon, authenticated;
revoke select on public.viajes, public.ofertas from anon;

-- ---------------------------------------------------------------------------
-- Funciones de ayuda para las políticas
-- ---------------------------------------------------------------------------

-- Conductor disponible de la misma universidad que el viaje.
create function privado.puede_ver_solicitud(p_universidad smallint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles p
    where p.id = auth.uid()
      and p.rol = 'conductor'
      and p.disponible
      and p.universidad_id = p_universidad
  );
$$;

create function privado.es_dueno_del_viaje(p_viaje uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.viajes v
    where v.id = p_viaje and v.estudiante_id = auth.uid()
  );
$$;

-- La otra persona de un viaje aceptado o en curso conmigo.
create function privado.comparte_viaje_activo(p_otro uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.viajes v
    where v.estado in ('aceptado', 'en_curso')
      and (
        (v.estudiante_id = auth.uid() and v.conductor_id = p_otro)
        or (v.conductor_id = auth.uid() and v.estudiante_id = p_otro)
      )
  );
$$;

-- Un conductor que me ofertó en mi viaje que sigue buscando, o que me lleva.
create function privado.es_mi_conductor(p_conductor uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.viajes v
    where v.estudiante_id = auth.uid()
      and (
        (v.estado in ('aceptado', 'en_curso') and v.conductor_id = p_conductor)
        or (v.estado = 'solicitado' and exists (
          select 1 from public.ofertas o
          where o.viaje_id = v.id and o.conductor_id = p_conductor and o.estado = 'activa'
        ))
      )
  );
$$;

revoke all on function privado.puede_ver_solicitud(smallint) from public, anon;
revoke all on function privado.es_dueno_del_viaje(uuid) from public, anon;
revoke all on function privado.comparte_viaje_activo(uuid) from public, anon;
revoke all on function privado.es_mi_conductor(uuid) from public, anon;
grant execute on function privado.puede_ver_solicitud(smallint) to authenticated;
grant execute on function privado.es_dueno_del_viaje(uuid) to authenticated;
grant execute on function privado.comparte_viaje_activo(uuid) to authenticated;
grant execute on function privado.es_mi_conductor(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Políticas de lectura
-- ---------------------------------------------------------------------------

create policy "viajes: participantes y conductores disponibles"
  on public.viajes for select
  to authenticated
  using (
    estudiante_id = (select auth.uid())
    or conductor_id = (select auth.uid())
    or (estado = 'solicitado' and privado.puede_ver_solicitud(universidad_id))
  );

create policy "ofertas: el conductor que oferta y el dueño del viaje"
  on public.ofertas for select
  to authenticated
  using (
    conductor_id = (select auth.uid())
    or privado.es_dueno_del_viaje(viaje_id)
  );

-- Durante el viaje, cada uno ve el perfil completo del otro (teléfono incluido).
create policy "perfiles: la otra persona del viaje activo"
  on public.perfiles for select
  to authenticated
  using (privado.comparte_viaje_activo(id));

-- El estudiante ve el vehículo de quien le oferta o lo lleva.
create policy "vehiculos: el estudiante ve el de su conductor"
  on public.vehiculos for select
  to authenticated
  using (privado.es_mi_conductor(conductor_id));

-- ---------------------------------------------------------------------------
-- Funciones RPC (las llaman las Server Actions)
-- ---------------------------------------------------------------------------

create function public.solicitar_viaje(
  p_origen_lat double precision,
  p_origen_lng double precision,
  p_origen_texto text,
  p_destino_lat double precision,
  p_destino_lng double precision,
  p_destino_texto text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo public.perfiles := privado.mi_perfil();
  v_id uuid;
begin
  if v_yo.id is null then
    raise exception 'Inicia sesión primero.';
  end if;
  if v_yo.rol is distinct from 'estudiante' then
    raise exception 'Solo los estudiantes pueden pedir viajes.';
  end if;

  begin
    insert into public.viajes (
      estudiante_id, universidad_id,
      origen_lat, origen_lng, origen_texto,
      destino_lat, destino_lng, destino_texto
    ) values (
      v_yo.id, v_yo.universidad_id,
      p_origen_lat, p_origen_lng, btrim(p_origen_texto),
      p_destino_lat, p_destino_lng, btrim(p_destino_texto)
    )
    returning id into v_id;
  exception
    when unique_violation then
      raise exception 'Ya tienes un viaje activo.';
    when check_violation or not_null_violation then
      raise exception 'Revisa el origen y el destino del viaje.';
  end;
  return v_id;
end;
$$;

-- Ofertar o cambiar el precio de la propia oferta.
create function public.ofertar(p_viaje uuid, p_precio integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo public.perfiles := privado.mi_perfil();
  v_viaje public.viajes;
  v_id uuid;
begin
  if v_yo.id is null then
    raise exception 'Inicia sesión primero.';
  end if;
  if v_yo.rol is distinct from 'conductor' or not v_yo.disponible then
    raise exception 'Ponte disponible para ofertar.';
  end if;
  if not exists (select 1 from public.vehiculos where conductor_id = v_yo.id) then
    raise exception 'Registra tu vehículo antes de ofertar.';
  end if;
  if p_precio is null or p_precio < 1000 or p_precio > 100000 then
    raise exception 'El precio debe estar entre $1.000 y $100.000.';
  end if;
  if exists (
    select 1 from public.viajes
    where conductor_id = v_yo.id and estado in ('aceptado', 'en_curso')
  ) then
    raise exception 'Termina tu viaje actual antes de ofertar en otro.';
  end if;

  -- Bloquea el viaje para que nadie lo acepte mientras ofertamos.
  select * into v_viaje from public.viajes where id = p_viaje for update;
  if v_viaje.id is null
     or v_viaje.estado <> 'solicitado'
     or v_viaje.universidad_id <> v_yo.universidad_id then
    raise exception 'Este viaje ya no está disponible.';
  end if;
  if v_viaje.estudiante_id = v_yo.id then
    raise exception 'No puedes ofertar en tu propio viaje.';
  end if;

  insert into public.ofertas (viaje_id, conductor_id, precio)
  values (p_viaje, v_yo.id, p_precio)
  on conflict (viaje_id, conductor_id) do update
    set precio = excluded.precio, estado = 'activa', creada_en = now()
  returning id into v_id;
  return v_id;
end;
$$;

create function public.retirar_oferta(p_viaje uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión primero.';
  end if;
  perform 1 from public.viajes where id = p_viaje and estado = 'solicitado' for update;
  if not found then
    raise exception 'Este viaje ya no está disponible.';
  end if;
  update public.ofertas set estado = 'retirada'
  where viaje_id = p_viaje and conductor_id = auth.uid() and estado = 'activa';
  if not found then
    raise exception 'No tienes una oferta activa en este viaje.';
  end if;
end;
$$;

create function public.aceptar_oferta(p_oferta uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_oferta public.ofertas;
  v_viaje public.viajes;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión primero.';
  end if;

  select * into v_oferta from public.ofertas where id = p_oferta;
  if v_oferta.id is null then
    raise exception 'Esa oferta no existe.';
  end if;
  select * into v_viaje from public.viajes where id = v_oferta.viaje_id for update;
  if v_viaje.estudiante_id <> auth.uid() then
    raise exception 'Esa oferta no existe.';
  end if;
  if v_viaje.estado <> 'solicitado' then
    raise exception 'Este viaje ya no está buscando conductor.';
  end if;
  -- Se vuelve a leer, ahora bloqueada: pudo retirarse mientras tanto.
  select * into v_oferta from public.ofertas where id = p_oferta for update;
  if v_oferta.estado <> 'activa' then
    raise exception 'El conductor retiró esa oferta.';
  end if;

  begin
    update public.viajes
    set estado = 'aceptado',
        conductor_id = v_oferta.conductor_id,
        precio = v_oferta.precio,
        aceptado_en = now()
    where id = v_viaje.id;
  exception
    when unique_violation then
      raise exception 'Ese conductor acaba de tomar otro viaje. Elige otra oferta.';
  end;

  update public.ofertas
  set estado = case when id = p_oferta then 'aceptada'::public.estado_oferta
                    else 'rechazada'::public.estado_oferta end
  where viaje_id = v_viaje.id and estado = 'activa';

  -- El conductor ya tiene viaje: sus ofertas en otros viajes se retiran.
  update public.ofertas
  set estado = 'retirada'
  where conductor_id = v_oferta.conductor_id
    and viaje_id <> v_viaje.id
    and estado = 'activa';
end;
$$;

create function public.iniciar_viaje(p_viaje uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.viajes set estado = 'en_curso', iniciado_en = now()
  where id = p_viaje and estado = 'aceptado' and conductor_id = auth.uid();
  if not found then
    raise exception 'No puedes iniciar este viaje.';
  end if;
end;
$$;

create function public.terminar_viaje(p_viaje uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.viajes set estado = 'terminado', terminado_en = now()
  where id = p_viaje and estado = 'en_curso' and conductor_id = auth.uid();
  if not found then
    raise exception 'No puedes terminar este viaje.';
  end if;
end;
$$;

-- Regla provisional (pregunta 8 de docs/reglas.md): sin penalización.
create function public.cancelar_viaje(p_viaje uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.viajes
  set estado = 'cancelado', cancelado_en = now(), cancelado_por = auth.uid()
  where id = p_viaje
    and (
      (estado = 'solicitado' and estudiante_id = auth.uid())
      or (estado = 'aceptado' and auth.uid() in (estudiante_id, conductor_id))
    );
  if not found then
    raise exception 'No puedes cancelar este viaje.';
  end if;

  update public.ofertas set estado = 'rechazada'
  where viaje_id = p_viaje and estado = 'activa';
end;
$$;

revoke all on function public.solicitar_viaje(double precision, double precision, text, double precision, double precision, text) from public, anon;
revoke all on function public.ofertar(uuid, integer) from public, anon;
revoke all on function public.retirar_oferta(uuid) from public, anon;
revoke all on function public.aceptar_oferta(uuid) from public, anon;
revoke all on function public.iniciar_viaje(uuid) from public, anon;
revoke all on function public.terminar_viaje(uuid) from public, anon;
revoke all on function public.cancelar_viaje(uuid) from public, anon;
grant execute on function public.solicitar_viaje(double precision, double precision, text, double precision, double precision, text) to authenticated;
grant execute on function public.ofertar(uuid, integer) to authenticated;
grant execute on function public.retirar_oferta(uuid) to authenticated;
grant execute on function public.aceptar_oferta(uuid) to authenticated;
grant execute on function public.iniciar_viaje(uuid) to authenticated;
grant execute on function public.terminar_viaje(uuid) to authenticated;
grant execute on function public.cancelar_viaje(uuid) to authenticated;
