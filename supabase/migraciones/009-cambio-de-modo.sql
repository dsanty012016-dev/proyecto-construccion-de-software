-- 009 · Cambio de modo: la misma cuenta usa UniGo como estudiante o como conductor
-- Decisión del equipo (docs/reglas.md): quien se registró como pasajero puede
-- llevar a alguien un día, y al revés. La columna perfiles.rol pasa a ser el
-- "modo actual". elegir_rol (002) sigue sirviendo solo para la primera vez.
--
-- Reglas:
-- - No se cambia de modo con un viaje en marcha: como estudiante (solicitado,
--   aceptado o en curso) ni como conductor (aceptado o en curso).
-- - Al cambiar, deja de estar disponible y se retiran sus ofertas activas.
-- - El vehículo se conserva; para ponerse disponible sigue haciendo falta.
--
-- Carreras: cambiar_modo bloquea la fila del perfil. Los triggers de abajo leen
-- ese perfil con "for share" al pedir un viaje u ofertar, así que esperan a que
-- el cambio termine y ven el modo nuevo. Las ofertas se retiran ANTES de revisar
-- los viajes: si el estudiante estaba aceptando una oferta en ese instante,
-- se espera a que termine y la revisión ya ve el viaje aceptado.

create function public.cambiar_modo(p_modo public.rol_usuario)
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

  update public.perfiles set rol = p_modo, disponible = false where id = v_yo.id;
end;
$$;

revoke all on function public.cambiar_modo(public.rol_usuario) from public, anon;
grant execute on function public.cambiar_modo(public.rol_usuario) to authenticated;

-- ---------------------------------------------------------------------------
-- Respaldo en las tablas: el modo se revisa al crear viajes y ofertas
-- ---------------------------------------------------------------------------

create function privado.revisar_modo_al_pedir()
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
  return new;
end;
$$;

create function privado.revisar_modo_al_ofertar()
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
  return new;
end;
$$;

revoke all on function privado.revisar_modo_al_pedir() from public, anon, authenticated;
revoke all on function privado.revisar_modo_al_ofertar() from public, anon, authenticated;

create trigger modo_estudiante_al_pedir
  before insert on public.viajes
  for each row execute function privado.revisar_modo_al_pedir();

create trigger modo_conductor_al_ofertar
  before insert or update of estado on public.ofertas
  for each row
  when (new.estado = 'activa')
  execute function privado.revisar_modo_al_ofertar();
