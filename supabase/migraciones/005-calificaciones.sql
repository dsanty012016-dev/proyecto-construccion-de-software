-- 005 · Calificaciones y perfil público
-- Al terminar un viaje, el estudiante califica al conductor y viceversa (1 a 5
-- estrellas, una vez por viaje). El promedio se muestra en las ofertas y en
-- las estadísticas del conductor.

create table public.calificaciones (
  id uuid primary key default gen_random_uuid(),
  viaje_id uuid not null references public.viajes (id) on delete cascade,
  autor_id uuid not null references public.perfiles (id),
  calificado_id uuid not null references public.perfiles (id),
  estrellas smallint not null check (estrellas between 1 and 5),
  comentario text check (char_length(comentario) <= 300),
  creada_en timestamptz not null default now(),
  unique (viaje_id, autor_id),
  check (autor_id <> calificado_id)
);

create index calificaciones_por_calificado on public.calificaciones (calificado_id);

alter table public.calificaciones enable row level security;

revoke insert, update, delete, truncate on public.calificaciones from anon, authenticated;
revoke select on public.calificaciones from anon;

create policy "calificaciones: las que hice y las que recibí"
  on public.calificaciones for select
  to authenticated
  using (autor_id = (select auth.uid()) or calificado_id = (select auth.uid()));

create function public.calificar(p_viaje uuid, p_estrellas integer, p_comentario text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_viaje public.viajes;
  v_otro uuid;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión primero.';
  end if;
  select * into v_viaje from public.viajes where id = p_viaje;
  if v_viaje.id is null or auth.uid() not in (v_viaje.estudiante_id, v_viaje.conductor_id) then
    raise exception 'No puedes calificar este viaje.';
  end if;
  if v_viaje.estado <> 'terminado' then
    raise exception 'Solo se califican viajes terminados.';
  end if;
  if p_estrellas is null or p_estrellas not between 1 and 5 then
    raise exception 'La calificación va de 1 a 5 estrellas.';
  end if;

  v_otro := case when auth.uid() = v_viaje.estudiante_id
                 then v_viaje.conductor_id else v_viaje.estudiante_id end;
  begin
    insert into public.calificaciones (viaje_id, autor_id, calificado_id, estrellas, comentario)
    values (p_viaje, auth.uid(), v_otro, p_estrellas,
            left(nullif(btrim(p_comentario), ''), 300));
  exception
    when unique_violation then
      raise exception 'Ya calificaste este viaje.';
  end;
end;
$$;

-- Nombre, rol y reputación de otras personas de la misma universidad, sin
-- teléfono. Sirve para mostrar quién oferta o quién pidió el viaje.
create function public.perfiles_publicos(p_ids uuid[])
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
  from public.perfiles p
  where auth.uid() is not null
    and cardinality(p_ids) <= 50
    and p.id = any (p_ids)
    and p.universidad_id = (select yo.universidad_id from public.perfiles yo where yo.id = auth.uid());
$$;

revoke all on function public.calificar(uuid, integer, text) from public, anon;
revoke all on function public.perfiles_publicos(uuid[]) from public, anon;
grant execute on function public.calificar(uuid, integer, text) to authenticated;
grant execute on function public.perfiles_publicos(uuid[]) to authenticated;
