-- 003 · Vehículos y disponibilidad del conductor
-- Un vehículo por conductor. Sin vehículo no puede ponerse disponible ni ofertar.

create table public.vehiculos (
  id uuid primary key default gen_random_uuid(),
  conductor_id uuid not null unique references public.perfiles (id) on delete cascade,
  -- Placa colombiana en mayúsculas y sin espacios: ABC123 (carro) o ABC12D (moto).
  placa text not null unique check (placa ~ '^[A-Z]{3}[0-9]{2}[0-9A-Z]$'),
  marca text not null check (char_length(btrim(marca)) between 1 and 40),
  modelo text not null check (char_length(btrim(modelo)) between 1 and 40),
  color text not null check (char_length(btrim(color)) between 1 and 30),
  creado_en timestamptz not null default now()
);

alter table public.vehiculos enable row level security;

create function privado.soy_conductor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles p
    where p.id = auth.uid() and p.rol = 'conductor'
  );
$$;

revoke all on function privado.soy_conductor() from public, anon;
grant execute on function privado.soy_conductor() to authenticated;

-- El conductor maneja su propio vehículo. El estudiante ve el vehículo de los
-- conductores que le ofertaron o que lo llevan (política en 004-viajes.sql).
create policy "vehiculos: el conductor ve el suyo"
  on public.vehiculos for select
  to authenticated
  using (conductor_id = (select auth.uid()));

create policy "vehiculos: el conductor registra el suyo"
  on public.vehiculos for insert
  to authenticated
  with check (conductor_id = (select auth.uid()) and (select privado.soy_conductor()));

create policy "vehiculos: el conductor edita el suyo"
  on public.vehiculos for update
  to authenticated
  using (conductor_id = (select auth.uid()))
  with check (conductor_id = (select auth.uid()));

create policy "vehiculos: el conductor borra el suyo"
  on public.vehiculos for delete
  to authenticated
  using (conductor_id = (select auth.uid()));

revoke all on public.vehiculos from anon;
revoke truncate, references, trigger on public.vehiculos from authenticated;
-- El dueño del vehículo y su id no se cambian.
revoke update on public.vehiculos from authenticated;
grant update (placa, marca, modelo, color) on public.vehiculos to authenticated;

-- Sin vehículo, el conductor deja de estar disponible y se retiran sus ofertas.
create function privado.al_borrar_vehiculo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.perfiles set disponible = false where id = old.conductor_id;
  update public.ofertas set estado = 'retirada'
  where conductor_id = old.conductor_id and estado = 'activa';
  return old;
end;
$$;

revoke all on function privado.al_borrar_vehiculo() from public, anon, authenticated;

create trigger quitar_disponibilidad_sin_vehiculo
  after delete on public.vehiculos
  for each row execute function privado.al_borrar_vehiculo();

-- ---------------------------------------------------------------------------
-- RPC: "Estás disponible"
-- ---------------------------------------------------------------------------
-- Al apagarlo se retiran sus ofertas activas (las de 004-viajes.sql).
create function public.cambiar_disponibilidad(p_disponible boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión primero.';
  end if;
  if not privado.soy_conductor() then
    raise exception 'Solo los conductores pueden ponerse disponibles.';
  end if;
  if p_disponible and not exists (
    select 1 from public.vehiculos v where v.conductor_id = auth.uid()
  ) then
    raise exception 'Registra tu vehículo antes de ponerte disponible.';
  end if;

  update public.perfiles set disponible = p_disponible where id = auth.uid();

  if not p_disponible then
    update public.ofertas o set estado = 'retirada'
    from public.viajes v
    where o.viaje_id = v.id
      and o.conductor_id = auth.uid()
      and o.estado = 'activa'
      and v.estado = 'solicitado';
  end if;
end;
$$;

revoke all on function public.cambiar_disponibilidad(boolean) from public, anon;
grant execute on function public.cambiar_disponibilidad(boolean) to authenticated;
