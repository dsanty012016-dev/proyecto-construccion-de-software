-- 037: avisos de emergencia a los administradores.
-- En un viaje o cupo activo, el estudiante o el conductor puede llamar al 123
-- desde la app (eso lo hace el teléfono) y, a la vez, dejar un aviso urgente
-- para el equipo de UniGo: quién, en qué viaje, dónde y cuándo. Los
-- administradores lo reciben como notificación y lo marcan como atendido.
-- Solo se guarda lo necesario para ayudar; nadie más que quien avisó y los
-- administradores lo ve.

create table public.emergencias (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null references public.perfiles (id) on delete cascade,
  viaje_id uuid references public.viajes (id) on delete set null,
  cupo_id uuid references public.cupos (id) on delete set null,
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  creada_en timestamptz not null default now(),
  atendida_en timestamptz,
  atendida_por uuid references public.perfiles (id) on delete set null,
  check ((lat is null) = (lng is null))
);

create index emergencias_pendientes on public.emergencias (creada_en desc) where atendida_en is null;

alter table public.emergencias enable row level security;
revoke all on public.emergencias from anon, authenticated;
grant select on public.emergencias to authenticated;
create policy "emergencias: quien avisa y los administradores" on public.emergencias for select to authenticated
  using (autor_id = (select auth.uid()) or privado.soy_admin());

-- Deja el aviso y notifica a los administradores. Exactamente un viaje o un
-- cupo, activo y en el que participa quien avisa. Si no llega la ubicación del
-- teléfono, usa la última del conductor. Dos toques seguidos (menos de 2
-- minutos y sin atender) no duplican el aviso: devuelve el mismo.
create function public.reportar_emergencia(
  p_viaje uuid default null, p_cupo uuid default null,
  p_lat double precision default null, p_lng double precision default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  yo uuid := auth.uid();
  v_id uuid;
  v_lat double precision := p_lat;
  v_lng double precision := p_lng;
  v_nombre text;
  v_admins uuid[];
begin
  if yo is null then
    raise exception 'Inicia sesión primero.';
  end if;
  if (p_viaje is null) = (p_cupo is null) then
    raise exception 'Indica el viaje o el cupo.';
  end if;
  if (v_lat is null) <> (v_lng is null) or v_lat not between -90 and 90 or v_lng not between -180 and 180 then
    v_lat := null;
    v_lng := null;
  end if;

  if p_viaje is not null then
    if not exists (select 1 from public.viajes v where v.id = p_viaje and v.estado in ('aceptado', 'en_curso')
                   and (v.estudiante_id = yo or v.conductor_id = yo)) then
      raise exception 'Este viaje no está activo.';
    end if;
    if v_lat is null then
      select u.lat, u.lng into v_lat, v_lng from public.ubicaciones_viaje u where u.viaje_id = p_viaje;
    end if;
  else
    if not exists (select 1 from public.cupos c where c.id = p_cupo and c.estado in ('publicado', 'en_curso')
                   and (c.conductor_id = yo or exists (
                     select 1 from public.puestos p where p.cupo_id = c.id and p.estudiante_id = yo and p.estado = 'aprobado' and p.pagado > 0))) then
      raise exception 'Este cupo no está activo.';
    end if;
    if v_lat is null then
      select u.lat, u.lng into v_lat, v_lng from public.ubicaciones_cupo u where u.cupo_id = p_cupo;
    end if;
  end if;

  select e.id into v_id from public.emergencias e
  where e.autor_id = yo and e.atendida_en is null and e.creada_en > now() - interval '2 minutes'
    and e.viaje_id is not distinct from p_viaje and e.cupo_id is not distinct from p_cupo
  limit 1;
  if v_id is not null then
    if v_lat is not null then
      update public.emergencias set lat = v_lat, lng = v_lng where id = v_id;
    end if;
    return v_id;
  end if;

  insert into public.emergencias (autor_id, viaje_id, cupo_id, lat, lng)
  values (yo, p_viaje, p_cupo, v_lat, v_lng)
  returning id into v_id;

  select split_part(nombre, ' ', 1) into v_nombre from public.perfiles where id = yo;
  select array_agg(id) into v_admins from public.perfiles where es_admin;
  if v_admins is not null then
    perform privado.avisar(v_admins, 'Emergencia en un viaje',
      coalesce(v_nombre, 'Alguien') || ' pidió ayuda. Revisa ahora.', '/admin?cola=emergencias');
  end if;
  return v_id;
end;
$$;

-- Un administrador la marca como atendida.
create function public.atender_emergencia(p_emergencia uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not privado.soy_admin() then
    raise exception 'Solo un administrador puede atender emergencias.';
  end if;
  update public.emergencias set atendida_en = now(), atendida_por = auth.uid()
  where id = p_emergencia and atendida_en is null;
end;
$$;

revoke all on function public.reportar_emergencia(uuid, uuid, double precision, double precision) from public, anon;
revoke all on function public.atender_emergencia(uuid) from public, anon;
grant execute on function public.reportar_emergencia(uuid, uuid, double precision, double precision) to authenticated;
grant execute on function public.atender_emergencia(uuid) to authenticated;
