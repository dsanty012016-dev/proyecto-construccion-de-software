-- 036: "Voy para la U" en los cupos de regreso.
-- En el regreso (017) todos se suben en la U, así que lo que el estudiante
-- necesita es ver al conductor mientras llega a la U, antes de que toque
-- "Salir". Con este cambio el conductor avisa "Voy para la U": desde ese
-- momento comparte su ubicación, solo con quienes ya pagaron su puesto, igual
-- que con el cupo en camino (014). Se puede avisar una vez, con el cupo
-- publicado y al menos un puesto pagado. Al terminar o cancelar el cupo la
-- ubicación se borra como siempre (014).

alter table public.cupos add column rumbo_a_la_u_en timestamptz;

-- Soy el conductor de este cupo o voy en él con el puesto pagado, y el
-- conductor está compartiendo: cupo en camino, o regreso rumbo a la U.
create or replace function privado.voy_en_cupo_en_curso(p_cupo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.cupos c
    where c.id = p_cupo
      and (c.estado = 'en_curso' or (c.estado = 'publicado' and c.sentido = 'regreso' and c.rumbo_a_la_u_en is not null))
      and (
        c.conductor_id = auth.uid()
        or exists (
          select 1 from public.puestos p
          where p.cupo_id = c.id and p.estudiante_id = auth.uid() and p.estado = 'aprobado' and p.pagado > 0
        )
      )
  );
$$;

create or replace function public.reportar_ubicacion_cupo(
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
  if v_cupo.id is null or v_cupo.conductor_id is distinct from auth.uid()
     or not (v_cupo.estado = 'en_curso'
             or (v_cupo.estado = 'publicado' and v_cupo.sentido = 'regreso' and v_cupo.rumbo_a_la_u_en is not null)) then
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

-- El conductor avisa que va para la U. Avisa también a quienes pagaron.
create function public.voy_para_la_u(p_cupo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cupo public.cupos;
  v_pagaron uuid[];
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión primero.';
  end if;
  select * into v_cupo from public.cupos where id = p_cupo for update;
  if v_cupo.id is null or v_cupo.conductor_id is distinct from auth.uid()
     or v_cupo.estado <> 'publicado' or v_cupo.sentido <> 'regreso' then
    raise exception 'Solo puedes avisar que vas para la U en un cupo de regreso que aún no sale.';
  end if;
  if v_cupo.rumbo_a_la_u_en is not null then
    return;
  end if;
  select array_agg(estudiante_id) into v_pagaron
  from public.puestos where cupo_id = p_cupo and estado = 'aprobado' and pagado > 0;
  if v_pagaron is null then
    raise exception 'Aún nadie ha pagado su puesto: no hay a quién mostrarle tu ubicación.';
  end if;

  update public.cupos set rumbo_a_la_u_en = now() where id = p_cupo;
  perform privado.avisar(v_pagaron, 'Tu conductor va para la U', 'Míralo llegar en el mapa.', '/estudiante/cupos/' || p_cupo);
end;
$$;

revoke all on function public.voy_para_la_u(uuid) from public, anon;
grant execute on function public.voy_para_la_u(uuid) to authenticated;
