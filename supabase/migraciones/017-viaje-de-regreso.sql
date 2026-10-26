-- 017 · Viaje de regreso: de la universidad a la casa
-- - Viajes por pedido y cupos tienen un sentido: 'ida' (a la U, como hasta
--   ahora) o 'regreso' (de la U a la casa). Los que ya existían quedan en ida.
-- - El extremo de la universidad (el destino en la ida, la recogida en el
--   regreso) debe quedar a máximo 500 m de la sede: por defecto es el punto
--   de la sede, pero se puede mover a otra portería o esquina cercana.
-- - El otro extremo debe quedar a 100 m o más del de la universidad.
-- - Cupo de regreso: sale de la U (máximo 500 m de la sede) y el conductor
--   marca hasta dónde va. Cada estudiante marca dónde se baja; la columna
--   recogida_* del puesto guarda ese punto (en la ida es donde lo recogen).
-- - Pago, cancelación, strikes, seguimiento y compartir: las mismas reglas.

create type public.sentido_viaje as enum ('ida', 'regreso');

alter table public.viajes add column sentido public.sentido_viaje not null default 'ida';
alter table public.cupos add column sentido public.sentido_viaje not null default 'ida';

-- ---------------------------------------------------------------------------
-- Distancias (las mismas cuentas de app/lib/mapa.ts y app/lib/sentido.ts)
-- ---------------------------------------------------------------------------

-- Distancia en línea recta (haversine), en kilómetros.
create function privado.distancia_km(
  p_a_lat double precision,
  p_a_lng double precision,
  p_b_lat double precision,
  p_b_lng double precision
)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select 2 * 6371 * asin(least(1, sqrt(
    power(sin(radians(p_b_lat - p_a_lat) / 2), 2)
    + cos(radians(p_a_lat)) * cos(radians(p_b_lat)) * power(sin(radians(p_b_lng - p_a_lng) / 2), 2)
  )));
$$;

-- ¿El punto queda a máximo 500 m de la sede de esa universidad?
create function privado.cerca_de_la_sede(p_universidad smallint, p_lat double precision, p_lng double precision)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select privado.distancia_km(u.lat, u.lng, p_lat, p_lng) <= 0.5
    from public.universidades u
    where u.id = p_universidad
  ), false);
$$;

revoke all on function privado.distancia_km(double precision, double precision, double precision, double precision) from public, anon, authenticated;
revoke all on function privado.cerca_de_la_sede(smallint, double precision, double precision) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Pedir viaje: mismo de 004, con el sentido y las distancias.
-- ---------------------------------------------------------------------------

drop function public.solicitar_viaje(double precision, double precision, text, double precision, double precision, text);

create function public.solicitar_viaje(
  p_origen_lat double precision,
  p_origen_lng double precision,
  p_origen_texto text,
  p_destino_lat double precision,
  p_destino_lng double precision,
  p_destino_texto text,
  p_sentido public.sentido_viaje default 'ida'
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
  if p_sentido is null then
    raise exception 'Elige si vas a la U o sales de la U.';
  end if;

  if p_sentido = 'ida' and not privado.cerca_de_la_sede(v_yo.universidad_id, p_destino_lat, p_destino_lng) then
    raise exception 'El viaje debe terminar en la universidad (máximo 500 m de la sede).';
  end if;
  if p_sentido = 'regreso' and not privado.cerca_de_la_sede(v_yo.universidad_id, p_origen_lat, p_origen_lng) then
    raise exception 'Te recogen en la universidad: el punto debe estar a máximo 500 m de la sede.';
  end if;
  if privado.distancia_km(p_origen_lat, p_origen_lng, p_destino_lat, p_destino_lng) < 0.1 then
    raise exception 'Revisa el origen y el destino del viaje: están a menos de 100 m.';
  end if;

  begin
    insert into public.viajes (
      estudiante_id, universidad_id, sentido,
      origen_lat, origen_lng, origen_texto,
      destino_lat, destino_lng, destino_texto
    ) values (
      v_yo.id, v_yo.universidad_id, p_sentido,
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

revoke all on function public.solicitar_viaje(double precision, double precision, text, double precision, double precision, text, public.sentido_viaje) from public, anon;
grant execute on function public.solicitar_viaje(double precision, double precision, text, double precision, double precision, text, public.sentido_viaje) to authenticated;

-- ---------------------------------------------------------------------------
-- Publicar cupo: mismo de 010, con el sentido. En la ida el destino es la
-- sede (lo pone la base); en el regreso la salida es la U y el destino lo
-- marca el conductor.
-- ---------------------------------------------------------------------------

drop function public.publicar_cupo(double precision, double precision, text, timestamptz, integer, integer);

create function public.publicar_cupo(
  p_salida_lat double precision,
  p_salida_lng double precision,
  p_salida_texto text,
  p_sale_en timestamptz,
  p_puestos integer,
  p_precio integer,
  p_sentido public.sentido_viaje default 'ida',
  p_destino_lat double precision default null,
  p_destino_lng double precision default null,
  p_destino_texto text default null
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
  v_destino_lat double precision;
  v_destino_lng double precision;
  v_destino_texto text;
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

  if p_sentido is null then
    raise exception 'Elige si vas a la U o sales de la U.';
  elsif p_sentido = 'ida' then
    v_destino_lat := v_sede.lat;
    v_destino_lng := v_sede.lng;
    v_destino_texto := v_sede.nombre;
  else
    if not privado.cerca_de_la_sede(v_yo.universidad_id, p_salida_lat, p_salida_lng) then
      raise exception 'El cupo de regreso sale de la universidad: el punto debe estar a máximo 500 m de la sede.';
    end if;
    if p_destino_lat is null or p_destino_lng is null or nullif(btrim(p_destino_texto), '') is null then
      raise exception 'Marca en el mapa hasta dónde vas.';
    end if;
    v_destino_lat := p_destino_lat;
    v_destino_lng := p_destino_lng;
    v_destino_texto := btrim(p_destino_texto);
  end if;
  if privado.distancia_km(p_salida_lat, p_salida_lng, v_destino_lat, v_destino_lng) < 0.1 then
    raise exception 'La salida y el destino están a menos de 100 m.';
  end if;

  begin
    insert into public.cupos (
      conductor_id, universidad_id, sentido,
      salida_lat, salida_lng, salida_texto,
      destino_lat, destino_lng, destino_texto,
      sale_en, puestos, precio
    ) values (
      v_yo.id, v_yo.universidad_id, p_sentido,
      p_salida_lat, p_salida_lng, btrim(p_salida_texto),
      v_destino_lat, v_destino_lng, v_destino_texto,
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

revoke all on function public.publicar_cupo(double precision, double precision, text, timestamptz, integer, integer, public.sentido_viaje, double precision, double precision, text) from public, anon;
grant execute on function public.publicar_cupo(double precision, double precision, text, timestamptz, integer, integer, public.sentido_viaje, double precision, double precision, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Enlaces compartidos: agregan el sentido. En un cupo de regreso el recorrido
-- del estudiante es de la salida (la U) hasta donde se baja.
-- ---------------------------------------------------------------------------

drop function public.viaje_compartido(text);

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
  ubicacion_en timestamptz,
  sentido public.sentido_viaje
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
    case when activo then u.actualizado_en end,
    v.sentido
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

drop function public.cupo_compartido(text);

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
  ubicacion_en timestamptz,
  sentido public.sentido_viaje
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
    case when a.activo then (case when c.sentido = 'ida' then pu.recogida_texto else c.salida_texto end) end,
    case when a.activo then (case when c.sentido = 'ida' then c.destino_texto else pu.recogida_texto end) end,
    case when a.activo then (case when c.sentido = 'ida' then pu.recogida_lat else c.salida_lat end) end,
    case when a.activo then (case when c.sentido = 'ida' then pu.recogida_lng else c.salida_lng end) end,
    case when a.activo then (case when c.sentido = 'ida' then c.destino_lat else pu.recogida_lat end) end,
    case when a.activo then (case when c.sentido = 'ida' then c.destino_lng else pu.recogida_lng end) end,
    case when a.activo then privado.nombre_corto(pe.nombre) end,
    case when a.activo then privado.nombre_corto(pc.nombre) end,
    case when a.activo then nullif(btrim(concat_ws(' ', ve.marca, ve.modelo, ve.color)), '') end,
    case when a.activo then ve.placa end,
    case when a.activo then u.lat end,
    case when a.activo then u.lng end,
    case when a.activo then u.actualizado_en end,
    c.sentido
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
