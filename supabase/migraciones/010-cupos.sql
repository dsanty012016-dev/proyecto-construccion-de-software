-- 010 · Cupos publicados por el conductor
-- La otra forma de viajar (docs/reglas.md, fase 4c): el conductor publica su
-- recorrido hacia la universidad con hora de salida, puestos y precio por
-- puesto; los estudiantes piden subirse en un punto del camino y el conductor
-- aprueba o rechaza cada solicitud.
--
-- Reglas que se hacen cumplir aquí:
-- - Publicar: modo conductor, con vehículo, salida entre 15 minutos y 7 días
--   desde ahora, moto 1 puesto y carro de 1 a 4, precio entre $1.000 y $100.000,
--   un cupo activo a la vez, sin viaje aceptado/en curso ni ofertas activas.
--   El destino es la sede de su universidad (lo pone la base, no la pantalla).
-- - Pedir puesto: modo estudiante, misma universidad, cupo publicado y antes de
--   la salida, sin otro viaje ni otro puesto activo, con puestos libres.
-- - Aprobar: solo el conductor del cupo y sin pasarse de los puestos.
-- - Nadie tiene a la vez un viaje (002-004) y un cupo o puesto activos, ni
--   cambia de modo con ellos en marcha (009).

create type public.estado_cupo as enum ('publicado', 'en_curso', 'terminado', 'cancelado');
create type public.estado_puesto as enum ('pendiente', 'aprobado', 'rechazado', 'retirado', 'cancelado');

create table public.cupos (
  id uuid primary key default gen_random_uuid(),
  conductor_id uuid not null references public.perfiles (id),
  universidad_id smallint not null references public.universidades (id),
  salida_lat double precision not null check (salida_lat between -90 and 90),
  salida_lng double precision not null check (salida_lng between -180 and 180),
  salida_texto text not null check (char_length(btrim(salida_texto)) between 1 and 200),
  destino_lat double precision not null check (destino_lat between -90 and 90),
  destino_lng double precision not null check (destino_lng between -180 and 180),
  destino_texto text not null check (char_length(btrim(destino_texto)) between 1 and 200),
  sale_en timestamptz not null,
  puestos smallint not null check (puestos between 1 and 4),
  precio integer not null check (precio between 1000 and 100000),
  estado public.estado_cupo not null default 'publicado',
  creado_en timestamptz not null default now(),
  iniciado_en timestamptz,
  terminado_en timestamptz,
  cancelado_en timestamptz,
  constraint salida_distinta_de_destino
    check (not (salida_lat = destino_lat and salida_lng = destino_lng))
);

create unique index cupos_uno_activo_por_conductor
  on public.cupos (conductor_id)
  where estado in ('publicado', 'en_curso');

create index cupos_publicados on public.cupos (universidad_id, sale_en)
  where estado = 'publicado';

create table public.puestos (
  id uuid primary key default gen_random_uuid(),
  cupo_id uuid not null references public.cupos (id) on delete cascade,
  estudiante_id uuid not null references public.perfiles (id),
  recogida_lat double precision not null check (recogida_lat between -90 and 90),
  recogida_lng double precision not null check (recogida_lng between -180 and 180),
  recogida_texto text not null check (char_length(btrim(recogida_texto)) between 1 and 200),
  estado public.estado_puesto not null default 'pendiente',
  creado_en timestamptz not null default now(),
  decidido_en timestamptz,
  unique (cupo_id, estudiante_id)
);

create index puestos_activos_por_estudiante on public.puestos (estudiante_id)
  where estado in ('pendiente', 'aprobado');

alter table public.cupos enable row level security;
alter table public.puestos enable row level security;

-- Solo se escriben con las funciones de abajo.
revoke insert, update, delete, truncate on public.cupos, public.puestos from anon, authenticated;
revoke select on public.cupos, public.puestos from anon;

-- ---------------------------------------------------------------------------
-- Funciones de ayuda para las políticas (security definer: sin recursión)
-- ---------------------------------------------------------------------------

-- Estudiante (en modo estudiante) de la misma universidad del cupo.
create function privado.puede_ver_cupos(p_universidad smallint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles p
    where p.id = auth.uid() and p.rol = 'estudiante' and p.universidad_id = p_universidad
  );
$$;

create function privado.tengo_puesto(p_cupo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.puestos p where p.cupo_id = p_cupo and p.estudiante_id = auth.uid()
  );
$$;

create function privado.es_mi_cupo(p_cupo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.cupos c where c.id = p_cupo and c.conductor_id = auth.uid()
  );
$$;

-- La otra persona de un cupo activo con puesto aprobado (para el teléfono).
create function privado.comparte_cupo_activo(p_otro uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.cupos c
    join public.puestos p on p.cupo_id = c.id
    where c.estado in ('publicado', 'en_curso')
      and p.estado = 'aprobado'
      and (
        (c.conductor_id = auth.uid() and p.estudiante_id = p_otro)
        or (p.estudiante_id = auth.uid() and c.conductor_id = p_otro)
      )
  );
$$;

-- El vehículo de un conductor con un cupo que yo puedo ver.
create function privado.vehiculo_de_cupo_visible(p_conductor uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.cupos c
    where c.conductor_id = p_conductor
      and (
        (c.estado = 'publicado' and privado.puede_ver_cupos(c.universidad_id))
        or privado.tengo_puesto(c.id)
      )
  );
$$;

-- ¿Tiene esta persona un cupo o un puesto activos?
create function privado.tiene_cupo_activo(p_persona uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.cupos c
    where c.conductor_id = p_persona and c.estado in ('publicado', 'en_curso')
  ) or exists (
    select 1 from public.puestos p
    join public.cupos c on c.id = p.cupo_id
    where p.estudiante_id = p_persona
      and p.estado in ('pendiente', 'aprobado')
      and c.estado in ('publicado', 'en_curso')
  );
$$;

revoke all on function privado.puede_ver_cupos(smallint) from public, anon;
revoke all on function privado.tengo_puesto(uuid) from public, anon;
revoke all on function privado.es_mi_cupo(uuid) from public, anon;
revoke all on function privado.comparte_cupo_activo(uuid) from public, anon;
revoke all on function privado.vehiculo_de_cupo_visible(uuid) from public, anon;
revoke all on function privado.tiene_cupo_activo(uuid) from public, anon, authenticated;
grant execute on function privado.puede_ver_cupos(smallint) to authenticated;
grant execute on function privado.tengo_puesto(uuid) to authenticated;
grant execute on function privado.es_mi_cupo(uuid) to authenticated;
grant execute on function privado.comparte_cupo_activo(uuid) to authenticated;
grant execute on function privado.vehiculo_de_cupo_visible(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Políticas de lectura
-- ---------------------------------------------------------------------------

create policy "cupos: el conductor, estudiantes de su universidad y quien pidió puesto"
  on public.cupos for select
  to authenticated
  using (
    conductor_id = (select auth.uid())
    or (estado = 'publicado' and privado.puede_ver_cupos(universidad_id))
    or privado.tengo_puesto(id)
  );

create policy "puestos: el estudiante y el conductor del cupo"
  on public.puestos for select
  to authenticated
  using (estudiante_id = (select auth.uid()) or privado.es_mi_cupo(cupo_id));

create policy "perfiles: la otra persona de un cupo activo"
  on public.perfiles for select
  to authenticated
  using (privado.comparte_cupo_activo(id));

create policy "vehiculos: el de un cupo que puedo ver"
  on public.vehiculos for select
  to authenticated
  using (privado.vehiculo_de_cupo_visible(conductor_id));

-- ---------------------------------------------------------------------------
-- Funciones RPC
-- ---------------------------------------------------------------------------

create function public.publicar_cupo(
  p_salida_lat double precision,
  p_salida_lng double precision,
  p_salida_texto text,
  p_sale_en timestamptz,
  p_puestos integer,
  p_precio integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo public.perfiles;
  v_placa text;
  v_sede public.universidades;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión primero.';
  end if;
  -- Bloquea el perfil: así no cambia de modo a mitad de la publicación.
  select * into v_yo from public.perfiles where id = auth.uid() for update;
  if v_yo.rol is distinct from 'conductor' then
    raise exception 'Cambia a modo conductor para publicar un cupo.';
  end if;
  select placa into v_placa from public.vehiculos where conductor_id = v_yo.id;
  if v_placa is null then
    raise exception 'Registra tu vehículo antes de publicar un cupo.';
  end if;
  if p_sale_en is null
     or p_sale_en < now() + interval '15 minutes'
     or p_sale_en > now() + interval '7 days' then
    raise exception 'La hora de salida debe ser entre 15 minutos y 7 días desde ahora.';
  end if;
  -- Placa de moto: termina en letra (ABC12D).
  if v_placa ~ '[A-Z]$' then
    if p_puestos is distinct from 1 then
      raise exception 'En moto solo puedes ofrecer 1 puesto.';
    end if;
  elsif p_puestos is null or p_puestos < 1 or p_puestos > 4 then
    raise exception 'Puedes ofrecer de 1 a 4 puestos.';
  end if;
  if p_precio is null or p_precio < 1000 or p_precio > 100000 then
    raise exception 'El precio debe estar entre $1.000 y $100.000.';
  end if;
  if exists (
    select 1 from public.viajes
    where conductor_id = v_yo.id and estado in ('aceptado', 'en_curso')
  ) then
    raise exception 'Termina tu viaje actual antes de publicar un cupo.';
  end if;
  if exists (select 1 from public.ofertas where conductor_id = v_yo.id and estado = 'activa') then
    raise exception 'Retira tus ofertas activas antes de publicar un cupo.';
  end if;

  select * into v_sede from public.universidades where id = v_yo.universidad_id;
  if v_sede.lat is null or v_sede.lng is null then
    raise exception 'Tu universidad todavía no tiene la ubicación de la sede.';
  end if;

  begin
    insert into public.cupos (
      conductor_id, universidad_id,
      salida_lat, salida_lng, salida_texto,
      destino_lat, destino_lng, destino_texto,
      sale_en, puestos, precio
    ) values (
      v_yo.id, v_yo.universidad_id,
      p_salida_lat, p_salida_lng, btrim(p_salida_texto),
      v_sede.lat, v_sede.lng, v_sede.nombre,
      p_sale_en, p_puestos, p_precio
    )
    returning id into v_id;
  exception
    when unique_violation then
      raise exception 'Ya tienes un cupo publicado.';
    when check_violation or not_null_violation then
      raise exception 'Revisa el punto de salida.';
  end;
  return v_id;
end;
$$;

create function public.pedir_puesto(
  p_cupo uuid,
  p_recogida_lat double precision,
  p_recogida_lng double precision,
  p_recogida_texto text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo public.perfiles;
  v_cupo public.cupos;
  v_puesto public.puestos;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión primero.';
  end if;
  select * into v_yo from public.perfiles where id = auth.uid() for update;
  if v_yo.rol is distinct from 'estudiante' then
    raise exception 'Cambia a modo estudiante para pedir un puesto.';
  end if;

  select * into v_cupo from public.cupos where id = p_cupo for update;
  if v_cupo.id is null
     or v_cupo.estado <> 'publicado'
     or v_cupo.universidad_id <> v_yo.universidad_id
     or v_cupo.sale_en <= now() then
    raise exception 'Este cupo ya no está disponible.';
  end if;
  if v_cupo.conductor_id = v_yo.id then
    raise exception 'No puedes pedir puesto en tu propio cupo.';
  end if;
  if exists (
    select 1 from public.viajes
    where estudiante_id = v_yo.id and estado in ('solicitado', 'aceptado', 'en_curso')
  ) then
    raise exception 'Ya tienes un viaje activo.';
  end if;

  select * into v_puesto from public.puestos where cupo_id = p_cupo and estudiante_id = v_yo.id;
  if v_puesto.estado in ('pendiente', 'aprobado') then
    raise exception 'Ya pediste puesto en este cupo.';
  end if;
  if v_puesto.estado = 'rechazado' then
    raise exception 'El conductor ya rechazó tu solicitud en este cupo.';
  end if;
  if exists (
    select 1 from public.puestos p
    join public.cupos c on c.id = p.cupo_id
    where p.estudiante_id = v_yo.id
      and p.cupo_id <> p_cupo
      and p.estado in ('pendiente', 'aprobado')
      and c.estado in ('publicado', 'en_curso')
  ) then
    raise exception 'Ya pediste puesto en otro cupo.';
  end if;
  if (select count(*) from public.puestos where cupo_id = p_cupo and estado = 'aprobado') >= v_cupo.puestos then
    raise exception 'Ya no quedan puestos en este cupo.';
  end if;

  begin
    if v_puesto.id is null then
      insert into public.puestos (cupo_id, estudiante_id, recogida_lat, recogida_lng, recogida_texto)
      values (p_cupo, v_yo.id, p_recogida_lat, p_recogida_lng, btrim(p_recogida_texto))
      returning id into v_id;
    else
      -- Lo había retirado: vuelve a pedirlo, quizás desde otro punto.
      update public.puestos
      set estado = 'pendiente', recogida_lat = p_recogida_lat, recogida_lng = p_recogida_lng,
          recogida_texto = btrim(p_recogida_texto), creado_en = now(), decidido_en = null
      where id = v_puesto.id
      returning id into v_id;
    end if;
  exception
    when check_violation or not_null_violation then
      raise exception 'Revisa el punto de recogida.';
  end;
  return v_id;
end;
$$;

create function public.responder_puesto(p_puesto uuid, p_aprobar boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_puesto public.puestos;
  v_cupo public.cupos;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión primero.';
  end if;
  select * into v_puesto from public.puestos where id = p_puesto;
  if v_puesto.id is null then
    raise exception 'Esa solicitud no existe.';
  end if;
  select * into v_cupo from public.cupos where id = v_puesto.cupo_id for update;
  if v_cupo.conductor_id <> auth.uid() then
    raise exception 'Esa solicitud no existe.';
  end if;
  if v_cupo.estado <> 'publicado' then
    raise exception 'Este cupo ya salió o se canceló.';
  end if;
  select * into v_puesto from public.puestos where id = p_puesto for update;
  if v_puesto.estado <> 'pendiente' then
    raise exception 'Esa solicitud ya no está pendiente.';
  end if;
  if p_aprobar and (
    select count(*) from public.puestos where cupo_id = v_cupo.id and estado = 'aprobado'
  ) >= v_cupo.puestos then
    raise exception 'Ya no quedan puestos en este cupo.';
  end if;

  update public.puestos
  set estado = case when p_aprobar then 'aprobado'::public.estado_puesto else 'rechazado'::public.estado_puesto end,
      decidido_en = now()
  where id = p_puesto;
end;
$$;

create function public.retirar_puesto(p_cupo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión primero.';
  end if;
  perform 1 from public.cupos where id = p_cupo and estado = 'publicado' for update;
  if not found then
    raise exception 'No tienes una solicitud activa en este cupo.';
  end if;
  update public.puestos set estado = 'retirado', decidido_en = now()
  where cupo_id = p_cupo and estudiante_id = auth.uid() and estado in ('pendiente', 'aprobado');
  if not found then
    raise exception 'No tienes una solicitud activa en este cupo.';
  end if;
end;
$$;

create function public.cancelar_cupo(p_cupo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.cupos set estado = 'cancelado', cancelado_en = now()
  where id = p_cupo and conductor_id = auth.uid() and estado = 'publicado';
  if not found then
    raise exception 'No puedes cancelar este cupo.';
  end if;
  update public.puestos set estado = 'cancelado', decidido_en = now()
  where cupo_id = p_cupo and estado in ('pendiente', 'aprobado');
end;
$$;

-- Al salir, las solicitudes que siguen pendientes quedan rechazadas.
create function public.iniciar_cupo(p_cupo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.cupos
  where id = p_cupo and conductor_id = auth.uid() and estado = 'publicado'
  for update;
  if not found then
    raise exception 'No puedes iniciar este cupo.';
  end if;
  if not exists (select 1 from public.puestos where cupo_id = p_cupo and estado = 'aprobado') then
    raise exception 'Aún no tienes estudiantes aprobados. Si no vas a salir, cancela el cupo.';
  end if;
  update public.cupos set estado = 'en_curso', iniciado_en = now() where id = p_cupo;
  update public.puestos set estado = 'rechazado', decidido_en = now()
  where cupo_id = p_cupo and estado = 'pendiente';
end;
$$;

create function public.terminar_cupo(p_cupo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.cupos set estado = 'terminado', terminado_en = now()
  where id = p_cupo and conductor_id = auth.uid() and estado = 'en_curso';
  if not found then
    raise exception 'No puedes terminar este cupo.';
  end if;
end;
$$;

-- Puestos libres de los cupos que la persona puede ver (sin mostrar quién
-- los ocupa: los puestos de otros estudiantes no se ven por RLS).
create function public.puestos_libres(p_cupos uuid[])
returns table (cupo_id uuid, libres integer)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id,
         greatest(0, c.puestos - (select count(*)::integer from public.puestos p
                                  where p.cupo_id = c.id and p.estado = 'aprobado'))
  from public.cupos c
  where auth.uid() is not null
    and cardinality(p_cupos) <= 50
    and c.id = any (p_cupos)
    and (
      c.conductor_id = auth.uid()
      or (c.estado = 'publicado' and privado.puede_ver_cupos(c.universidad_id))
      or privado.tengo_puesto(c.id)
    );
$$;

revoke all on function public.publicar_cupo(double precision, double precision, text, timestamptz, integer, integer) from public, anon;
revoke all on function public.pedir_puesto(uuid, double precision, double precision, text) from public, anon;
revoke all on function public.responder_puesto(uuid, boolean) from public, anon;
revoke all on function public.retirar_puesto(uuid) from public, anon;
revoke all on function public.cancelar_cupo(uuid) from public, anon;
revoke all on function public.iniciar_cupo(uuid) from public, anon;
revoke all on function public.terminar_cupo(uuid) from public, anon;
revoke all on function public.puestos_libres(uuid[]) from public, anon;
grant execute on function public.publicar_cupo(double precision, double precision, text, timestamptz, integer, integer) to authenticated;
grant execute on function public.pedir_puesto(uuid, double precision, double precision, text) to authenticated;
grant execute on function public.responder_puesto(uuid, boolean) to authenticated;
grant execute on function public.retirar_puesto(uuid) to authenticated;
grant execute on function public.cancelar_cupo(uuid) to authenticated;
grant execute on function public.iniciar_cupo(uuid) to authenticated;
grant execute on function public.terminar_cupo(uuid) to authenticated;
grant execute on function public.puestos_libres(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Cruces con los viajes y el cambio de modo (actualiza funciones de 009)
-- ---------------------------------------------------------------------------

create or replace function privado.revisar_modo_al_pedir()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.perfiles
  where id = new.estudiante_id and rol = 'estudiante'
  for share;
  if not found then
    raise exception 'Solo los estudiantes pueden pedir viajes.';
  end if;
  if privado.tiene_cupo_activo(new.estudiante_id) then
    raise exception 'Ya pediste puesto en un cupo. Retíralo antes de pedir un viaje.';
  end if;
  return new;
end;
$$;

create or replace function privado.revisar_modo_al_ofertar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.perfiles
  where id = new.conductor_id and rol = 'conductor' and disponible
  for share;
  if not found then
    raise exception 'Ponte disponible para ofertar.';
  end if;
  if privado.tiene_cupo_activo(new.conductor_id) then
    raise exception 'Tienes un cupo publicado: no puedes ofertar en otros viajes.';
  end if;
  return new;
end;
$$;

create or replace function public.cambiar_modo(p_modo public.rol_usuario)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo public.perfiles;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión primero.';
  end if;
  if p_modo is null then
    raise exception 'Elige estudiante o conductor.';
  end if;

  select * into v_yo from public.perfiles where id = auth.uid() for update;
  if v_yo.id is null then
    raise exception 'Inicia sesión primero.';
  end if;
  if v_yo.rol is null then
    raise exception 'Primero elige cómo vas a usar UniGo.';
  end if;
  if v_yo.rol = p_modo then
    return;
  end if;

  update public.ofertas set estado = 'retirada'
  where conductor_id = v_yo.id and estado = 'activa';

  if exists (
    select 1 from public.viajes v
    where (v.estudiante_id = v_yo.id and v.estado in ('solicitado', 'aceptado', 'en_curso'))
       or (v.conductor_id = v_yo.id and v.estado in ('aceptado', 'en_curso'))
  ) then
    raise exception 'Termina o cancela tu viaje antes de cambiar de modo.';
  end if;
  if privado.tiene_cupo_activo(v_yo.id) then
    raise exception 'Termina o cancela tu cupo antes de cambiar de modo.';
  end if;

  update public.perfiles set rol = p_modo, disponible = false where id = v_yo.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tiempo real
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.cupos, public.puestos;
