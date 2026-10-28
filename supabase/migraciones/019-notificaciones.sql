-- 019 · Notificaciones en el celular (Web Push)
-- - Cada celular que activa las notificaciones guarda su suscripción (la da
--   el navegador). Solo se guarda o borra la propia, con guardar_suscripcion
--   y borrar_suscripcion.
-- - Cuando pasa algo que le importa a alguien (llega una oferta, aceptan tu
--   oferta, sale tu cupo...), un trigger crea un aviso en privado.avisos y,
--   con pg_net, le avisa a la función "enviar-avisos" de Supabase, que lo
--   manda con las claves VAPID (secretos de esa función, no de la base).
-- - La función solo recibe el número del aviso: lo toma una vez de la base
--   (privado.tomar_aviso) y lo envía. Repetir la llamada no reenvía nada.
-- Qué se avisa (decidido por el equipo):
--   Estudiante: oferta nueva o cambio de precio; viaje empezó y terminó;
--     puesto aprobado, no aprobado o perdido por no pagar; el cupo salió y
--     llegó; cancelaciones del conductor y vencimientos (018).
--   Conductor: aceptaron su oferta; nueva solicitud de su universidad (si
--     está disponible y verificado); pidieron puesto en su cupo; el
--     estudiante canceló el viaje o dejó el puesto.
-- - Todo vive en el esquema privado: la app no puede leer suscripciones ni
--   avisos de nadie.

create table privado.suscripciones_push (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references public.perfiles (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) between 20 and 200),
  auth text not null check (char_length(auth) between 10 and 100),
  creada_en timestamptz not null default now()
);

create index suscripciones_por_persona on privado.suscripciones_push (persona_id);

create table privado.avisos (
  id bigint generated always as identity primary key,
  personas uuid[] not null,
  titulo text not null check (char_length(titulo) between 1 and 80),
  cuerpo text not null check (char_length(cuerpo) between 1 and 200),
  url text not null check (url ~ '^/[A-Za-z0-9/_?=&.-]*$'),
  creado_en timestamptz not null default now(),
  enviado_en timestamptz
);

alter table privado.suscripciones_push enable row level security;
alter table privado.avisos enable row level security;
revoke all on privado.suscripciones_push, privado.avisos from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Guardar y borrar la suscripción de este celular
-- ---------------------------------------------------------------------------

create function public.guardar_suscripcion(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión primero.';
  end if;
  begin
    insert into privado.suscripciones_push (persona_id, endpoint, p256dh, auth)
    values (auth.uid(), p_endpoint, p_p256dh, p_auth)
    on conflict (endpoint) do update
      set persona_id = excluded.persona_id, p256dh = excluded.p256dh, auth = excluded.auth, creada_en = now();
  exception
    when check_violation or not_null_violation then
      raise exception 'No pudimos activar las notificaciones en este celular.';
  end;
  -- Máximo 5 celulares o navegadores por persona: se quedan los más nuevos.
  delete from privado.suscripciones_push
  where persona_id = auth.uid()
    and id not in (
      select id from privado.suscripciones_push where persona_id = auth.uid() order by creada_en desc limit 5
    );
end;
$$;

create function public.borrar_suscripcion(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from privado.suscripciones_push where endpoint = p_endpoint and persona_id = auth.uid();
$$;

revoke all on function public.guardar_suscripcion(text, text, text) from public, anon;
revoke all on function public.borrar_suscripcion(text) from public, anon;
grant execute on function public.guardar_suscripcion(text, text, text) to authenticated;
grant execute on function public.borrar_suscripcion(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Crear y tomar avisos (los usan los triggers y la función de Supabase)
-- ---------------------------------------------------------------------------

/** "$7.000" */
create function privado.pesos(p_valor integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select '$' || replace(to_char(p_valor, 'FM999,999,999'), ',', '.');
$$;

-- Crea el aviso solo si alguna de esas personas tiene notificaciones activas,
-- y le pide a la función de Supabase que lo envíe (después del commit).
create function privado.avisar(p_personas uuid[], p_titulo text, p_cuerpo text, p_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_personas uuid[];
  v_id bigint;
begin
  select array_agg(distinct s.persona_id) into v_personas
  from privado.suscripciones_push s
  where s.persona_id = any (p_personas);
  if v_personas is null then
    return;
  end if;

  insert into privado.avisos (personas, titulo, cuerpo, url)
  values (v_personas, left(p_titulo, 80), left(p_cuerpo, 200), p_url)
  returning id into v_id;

  if exists (select 1 from pg_namespace where nspname = 'net') then
    perform net.http_post(
      url := 'https://jcdczmzaigeobybzscab.supabase.co/functions/v1/enviar-avisos',
      body := jsonb_build_object('aviso', v_id),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  end if;
end;
$$;

-- La función de Supabase toma el aviso una sola vez y recibe a dónde mandarlo.
create function privado.tomar_aviso(p_aviso bigint)
returns table (titulo text, cuerpo text, url text, endpoint text, p256dh text, auth text)
language sql
security definer
set search_path = ''
as $$
  with tomado as (
    update privado.avisos set enviado_en = now()
    where id = p_aviso and enviado_en is null and creado_en > now() - interval '1 hour'
    returning *
  )
  select t.titulo, t.cuerpo, t.url, s.endpoint, s.p256dh, s.auth
  from tomado t
  join privado.suscripciones_push s on s.persona_id = any (t.personas);
$$;

-- Suscripciones que el servicio de notificaciones ya no reconoce (celular
-- desinstalado, permiso quitado): se borran.
create function privado.borrar_suscripciones_vencidas(p_endpoints text[])
returns void
language sql
security definer
set search_path = ''
as $$
  delete from privado.suscripciones_push where endpoint = any (p_endpoints);
$$;

revoke all on function privado.pesos(integer) from public, anon, authenticated;
revoke all on function privado.avisar(uuid[], text, text, text) from public, anon, authenticated;
revoke all on function privado.tomar_aviso(bigint) from public, anon, authenticated;
revoke all on function privado.borrar_suscripciones_vencidas(text[]) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Qué se avisa
-- ---------------------------------------------------------------------------

-- Ofertas: al estudiante, cuando llega una o cambia el precio.
create function privado.avisar_oferta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estudiante uuid;
  v_conductor text;
begin
  if new.estado <> 'activa'
     or (tg_op = 'UPDATE' and old.estado = 'activa' and old.precio = new.precio) then
    return null;
  end if;
  select estudiante_id into v_estudiante from public.viajes where id = new.viaje_id;
  select privado.nombre_corto(nombre) into v_conductor from public.perfiles where id = new.conductor_id;
  perform privado.avisar(
    array[v_estudiante],
    case when tg_op = 'INSERT' or old.estado <> 'activa' then 'Nueva oferta' else 'Cambió una oferta' end,
    coalesce(nullif(v_conductor, ''), 'Un conductor') || ' te ofrece llevarte por ' || privado.pesos(new.precio) || '.',
    '/estudiante/viaje'
  );
  return null;
end;
$$;

-- Viajes nuevos: a los conductores disponibles y verificados de la universidad.
create function privado.avisar_solicitud()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conductores uuid[];
begin
  select array_agg(p.id) into v_conductores
  from public.perfiles p
  where p.rol = 'conductor' and p.disponible and p.universidad_id = new.universidad_id
    and p.id <> new.estudiante_id and privado.conductor_verificado(p.id);
  if v_conductores is null then
    return null;
  end if;
  perform privado.avisar(
    v_conductores,
    'Nueva solicitud de viaje',
    case when new.sentido = 'regreso' then 'De la U a ' || new.destino_texto else 'De ' || new.origen_texto || ' a la U' end || '. Envía tu precio.',
    '/conductor'
  );
  return null;
end;
$$;

-- Cambios de estado del viaje.
create function privado.avisar_viaje()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estudiante text;
begin
  if new.estado = old.estado then
    return null;
  end if;
  select privado.nombre_corto(nombre) into v_estudiante from public.perfiles where id = new.estudiante_id;
  v_estudiante := coalesce(nullif(v_estudiante, ''), 'el estudiante');

  if old.estado = 'solicitado' and new.estado = 'aceptado' then
    perform privado.avisar(array[new.conductor_id], '¡Aceptaron tu oferta!',
      'Ve a recoger a ' || v_estudiante || ' en ' || new.origen_texto || '.', '/conductor/viaje');
  elsif old.estado = 'aceptado' and new.estado = 'en_curso' then
    perform privado.avisar(array[new.estudiante_id], 'Tu viaje empezó',
      'Ya vas camino a ' || new.destino_texto || '.', '/estudiante/viaje');
  elsif new.estado = 'cancelado' and new.vencio then
    perform privado.avisar(array[new.estudiante_id], 'Tu solicitud venció',
      'Nadie la aceptó en 15 minutos. Puedes pedir el viaje de nuevo.', '/estudiante');
  elsif new.estado = 'cancelado' and old.estado = 'aceptado' then
    if new.cancelado_por = new.estudiante_id then
      perform privado.avisar(array[new.conductor_id], 'Viaje cancelado', v_estudiante || ' canceló el viaje.', '/conductor');
    else
      perform privado.avisar(array[new.estudiante_id], 'Tu conductor canceló el viaje',
        'Te devolvimos el dinero. Puedes pedir otro viaje.', '/estudiante');
    end if;
  elsif new.estado = 'terminado' then
    perform privado.avisar(array[new.estudiante_id], 'Llegaste', '¿Cómo te fue? Califica tu viaje.', '/viajes');
  end if;
  return null;
end;
$$;

-- Puestos de un cupo: solicitudes al conductor, respuestas al estudiante.
create function privado.avisar_puesto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cupo public.cupos;
  v_estudiante text;
begin
  if tg_op = 'UPDATE' and new.estado = old.estado then
    return null;
  end if;
  select * into v_cupo from public.cupos where id = new.cupo_id;
  if new.estado = 'pendiente' then
    select privado.nombre_corto(nombre) into v_estudiante from public.perfiles where id = new.estudiante_id;
    perform privado.avisar(array[v_cupo.conductor_id], 'Nueva solicitud de puesto',
      coalesce(nullif(v_estudiante, ''), 'Un estudiante') || ' quiere ir en tu cupo.', '/conductor/cupo');
  elsif tg_op = 'UPDATE' and old.estado = 'pendiente' and new.estado = 'aprobado' then
    perform privado.avisar(array[new.estudiante_id], 'Te aprobaron el puesto',
      'Págalo en la app hasta 10 minutos antes de la salida para asegurarlo.', '/estudiante/cupos/' || new.cupo_id);
  elsif tg_op = 'UPDATE' and old.estado = 'pendiente' and new.estado = 'rechazado' and v_cupo.estado = 'publicado' then
    perform privado.avisar(array[new.estudiante_id], 'No aprobaron tu solicitud',
      'Puedes buscar otro cupo.', '/estudiante/cupos');
  elsif tg_op = 'UPDATE' and new.estado = 'sin_pago' then
    perform privado.avisar(array[new.estudiante_id], 'Perdiste el puesto',
      'El cupo salió y tu puesto no estaba pagado.', '/estudiante/cupos');
  elsif tg_op = 'UPDATE' and old.estado = 'aprobado' and new.estado = 'retirado' then
    select privado.nombre_corto(nombre) into v_estudiante from public.perfiles where id = new.estudiante_id;
    perform privado.avisar(array[v_cupo.conductor_id], 'Dejaron un puesto',
      coalesce(nullif(v_estudiante, ''), 'Un estudiante') || ' dejó su puesto en tu cupo.', '/conductor/cupo');
  end if;
  return null;
end;
$$;

-- Cupos: salida, llegada y cancelación, a quienes van en el cupo.
create function privado.avisar_cupo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pagaron uuid[];
  v_con_puesto uuid[];
begin
  if new.estado = old.estado then
    return null;
  end if;
  select array_agg(estudiante_id) filter (where estado = 'aprobado' and pagado > 0),
         array_agg(estudiante_id) filter (where estado in ('pendiente', 'aprobado'))
  into v_pagaron, v_con_puesto
  from public.puestos where cupo_id = new.id;

  if old.estado = 'publicado' and new.estado = 'en_curso' and v_pagaron is not null then
    perform privado.avisar(v_pagaron, 'Tu conductor ya salió', 'Síguelo en vivo en el mapa.', '/estudiante/cupos/' || new.id);
  elsif new.estado = 'terminado' and v_pagaron is not null then
    perform privado.avisar(v_pagaron, 'Llegaron', '¿Cómo te fue? Califica al conductor.', '/viajes');
  elsif new.estado = 'cancelado' and v_con_puesto is not null then
    perform privado.avisar(v_con_puesto,
      case when new.vencio then 'El cupo no salió' else 'El conductor canceló el cupo' end,
      'Si pagaste, te devolvimos todo. Puedes buscar otro cupo.', '/estudiante/cupos');
  end if;
  return null;
end;
$$;

revoke all on function privado.avisar_oferta() from public, anon, authenticated;
revoke all on function privado.avisar_solicitud() from public, anon, authenticated;
revoke all on function privado.avisar_viaje() from public, anon, authenticated;
revoke all on function privado.avisar_puesto() from public, anon, authenticated;
revoke all on function privado.avisar_cupo() from public, anon, authenticated;

create trigger avisar_oferta after insert or update of estado, precio on public.ofertas
  for each row execute function privado.avisar_oferta();
create trigger avisar_solicitud after insert on public.viajes
  for each row execute function privado.avisar_solicitud();
create trigger avisar_viaje after update of estado on public.viajes
  for each row execute function privado.avisar_viaje();
create trigger avisar_puesto after insert or update of estado on public.puestos
  for each row execute function privado.avisar_puesto();
create trigger avisar_cupo after update of estado on public.cupos
  for each row execute function privado.avisar_cupo();

-- pg_net (Supabase lo trae) hace la llamada a la función de Supabase. En la
-- base de pruebas de GitHub no existe: ahí solo se crean los avisos.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net')
     and current_setting('shared_preload_libraries', true) like '%pg_net%' then
    create extension if not exists pg_net;
  end if;
end;
$$;
