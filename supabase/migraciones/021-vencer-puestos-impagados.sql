-- 021 · Vencimiento del puesto impagado, sin cobro ni strike.
-- El mismo criterio libera asientos, estudiantes y teléfonos. La tarea pone
-- además el estado sin_pago; las consultas no necesitan esperar al cron.

create function privado.puesto_sigue_activo(p_puesto public.puestos, p_sale_en timestamptz)
returns boolean language sql stable set search_path = ''
as $$
  select p_puesto.estado = 'pendiente' or privado.ocupa_puesto(p_puesto, p_sale_en);
$$;
revoke all on function privado.puesto_sigue_activo(public.puestos, timestamptz) from public, anon, authenticated;

create function privado.vencer_puestos_impagados(p_ahora timestamptz default now())
returns integer language plpgsql security definer set search_path = ''
as $$
declare v_cupo uuid; v_filas integer; v_total integer := 0;
begin
  -- Mismo orden que pagar_puesto: primero el cupo y luego sus puestos.
  for v_cupo in
    select c.id from public.cupos c
    where c.estado = 'publicado' and c.sale_en - interval '10 minutes' < p_ahora
      and exists (select 1 from public.puestos p where p.cupo_id = c.id and p.estado = 'aprobado' and p.pagado = 0)
    order by c.id for update of c skip locked
  loop
    update public.puestos set estado = 'sin_pago', decidido_en = p_ahora
    where cupo_id = v_cupo and estado = 'aprobado' and pagado = 0;
    get diagnostics v_filas = row_count;
    v_total := v_total + v_filas;
  end loop;
  return v_total;
end;
$$;
revoke all on function privado.vencer_puestos_impagados(timestamptz) from public, anon, authenticated;


create or replace function privado.tiene_cupo_activo(p_persona uuid)
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
      and privado.puesto_sigue_activo(p, c.sale_en)
      and c.estado in ('publicado', 'en_curso')
  );
$$;

create or replace function privado.comparte_cupo_activo(p_otro uuid)
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
      and p.estado = 'aprobado' and privado.ocupa_puesto(p, c.sale_en)
      and (
        (c.conductor_id = auth.uid() and p.estudiante_id = p_otro)
        or (p.estudiante_id = auth.uid() and c.conductor_id = p_otro)
      )
  );
$$;

create or replace function public.pedir_puesto(
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
  perform privado.revisar_suspension(v_yo.id);

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
      and privado.puesto_sigue_activo(p, c.sale_en)
      and c.estado in ('publicado', 'en_curso')
  ) then
    raise exception 'Ya pediste puesto en otro cupo.';
  end if;
  if (
    select count(*) from public.puestos p where p.cupo_id = p_cupo and privado.ocupa_puesto(p, v_cupo.sale_en)
  ) >= v_cupo.puestos then
    raise exception 'Ya no quedan puestos en este cupo.';
  end if;

  begin
    if v_puesto.id is null then
      insert into public.puestos (cupo_id, estudiante_id, recogida_lat, recogida_lng, recogida_texto)
      values (p_cupo, v_yo.id, p_recogida_lat, p_recogida_lng, btrim(p_recogida_texto))
      returning id into v_id;
    else
      update public.puestos
      set estado = 'pendiente', recogida_lat = p_recogida_lat, recogida_lng = p_recogida_lng,
          recogida_texto = btrim(p_recogida_texto), creado_en = now(), decidido_en = null, pagado = 0, pagado_en = null
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

create or replace function public.retirar_puesto(p_cupo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cupo public.cupos;
  v_puesto public.puestos;
  v_tarde boolean;
  v_cobro integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión primero.';
  end if;
  select * into v_cupo from public.cupos where id = p_cupo and estado = 'publicado' for update;
  if v_cupo.id is null then
    raise exception 'No tienes una solicitud activa en este cupo.';
  end if;
  select * into v_puesto from public.puestos
  where cupo_id = p_cupo and estudiante_id = auth.uid() and estado in ('pendiente', 'aprobado', 'sin_pago')
  for update;
  if v_puesto.id is null then
    raise exception 'No tienes una solicitud activa en este cupo.';
  end if;

  -- Perder un puesto impagado por vencimiento no es retirarlo tarde.
  if v_puesto.estado = 'sin_pago' then return; end if;
  if v_puesto.estado = 'aprobado' and v_puesto.pagado = 0
     and now() > v_cupo.sale_en - interval '10 minutes' then
    update public.puestos set estado = 'sin_pago', decidido_en = now() where id = v_puesto.id;
    return;
  end if;

  v_tarde := now() > v_cupo.sale_en - interval '40 minutes';
  if v_puesto.estado = 'aprobado' then
    if v_tarde then
      v_cobro := round(v_puesto.pagado * 30 / 100.0);
      perform privado.dar_strike(auth.uid(), 'Dejó un cupo a menos de 40 minutos de la salida', null, p_cupo);
    end if;
    perform privado.mover_saldo(auth.uid(), v_puesto.pagado - v_cobro, 'reembolso_puesto',
                                case when v_cobro > 0 then 'Devolución del puesto (menos 30 %)' else 'Devolución del puesto' end,
                                null, v_puesto.id);
    perform privado.pagar_conductor(v_cupo.conductor_id, v_cobro, 'Compensación: un estudiante dejó el cupo', null, v_puesto.id);
  end if;

  update public.puestos set estado = 'retirado', decidido_en = now(), pagado = 0 where id = v_puesto.id;
end;
$$;

create or replace function privado.avisar_puesto()
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
      'Pasó el límite para pagar tu puesto (10 minutos antes de la salida).', '/estudiante/cupos');
  elsif tg_op = 'UPDATE' and old.estado = 'aprobado' and new.estado = 'retirado' then
    select privado.nombre_corto(nombre) into v_estudiante from public.perfiles where id = new.estudiante_id;
    perform privado.avisar(array[v_cupo.conductor_id], 'Dejaron un puesto',
      coalesce(nullif(v_estudiante, ''), 'Un estudiante') || ' dejó su puesto en tu cupo.', '/conductor/cupo');
  end if;
  return null;
end;
$$;
-- pg_cron no existe en el Postgres simulado de las pruebas.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('unigo-vencer-puestos', '* * * * *', 'select privado.vencer_puestos_impagados()');
  end if;
end;
$$;
