-- 012 · Billetera simulada, cobros por cancelación, strikes y suspensiones
-- Reglas en docs/reglas.md (fase 4b). Resumen:
-- - Saldo por persona; cada cambio queda en "movimientos" (libro mayor).
-- - Viaje por pedido: se paga al aceptar la oferta y el dinero queda retenido
--   en el viaje; al terminar, el conductor recibe el 90 % y UniGo el 10 %.
-- - Cancelaciones: el estudiante con el conductor en camino paga 20 % y suma
--   strike (salvo que reporte mal comportamiento); el conductor que cancela
--   devuelve todo y suma strike.
-- - Cupos: se paga el puesto hasta 10 min antes; dejarlo con menos de 40 min
--   cuesta 30 % y un strike; el conductor que cancela con puestos pagados
--   devuelve todo y suma strike; al terminar, cobra el 90 % de cada puesto.
-- - 3 strikes = suspensión de 3, 7, 15 y luego 30 días; después vuelven a cero.
--
-- Nada de esto se escribe desde la app: solo con las funciones de abajo.

alter type public.estado_puesto add value 'sin_pago';

create type public.tipo_movimiento as enum (
  'recarga', 'pago_viaje', 'reembolso_viaje', 'ganancia', 'pago_puesto', 'reembolso_puesto'
);

create table public.billeteras (
  persona_id uuid primary key references public.perfiles (id) on delete cascade,
  saldo integer not null default 0 check (saldo >= 0),
  actualizado_en timestamptz not null default now()
);

create table public.movimientos (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references public.perfiles (id) on delete cascade,
  tipo public.tipo_movimiento not null,
  -- Positivo entra, negativo sale.
  monto integer not null check (monto <> 0),
  saldo_despues integer not null check (saldo_despues >= 0),
  descripcion text not null check (char_length(descripcion) between 1 and 200),
  viaje_id uuid references public.viajes (id) on delete set null,
  puesto_id uuid references public.puestos (id) on delete set null,
  creado_en timestamptz not null default now()
);

create index movimientos_por_persona on public.movimientos (persona_id, creado_en desc);

-- Lo que gana UniGo (el 10 %).
create table public.comisiones (
  id uuid primary key default gen_random_uuid(),
  monto integer not null check (monto > 0),
  viaje_id uuid references public.viajes (id) on delete set null,
  puesto_id uuid references public.puestos (id) on delete set null,
  creado_en timestamptz not null default now()
);

-- Dinero retenido: en el viaje desde que se acepta, en el puesto desde que se paga.
alter table public.viajes add column pago_retenido integer not null default 0 check (pago_retenido >= 0);
alter table public.puestos add column pagado integer not null default 0 check (pagado >= 0);
alter table public.puestos add column pagado_en timestamptz;

create table public.strikes (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references public.perfiles (id) on delete cascade,
  motivo text not null check (char_length(motivo) between 1 and 200),
  viaje_id uuid references public.viajes (id) on delete set null,
  cupo_id uuid references public.cupos (id) on delete set null,
  -- Deja de contar cuando provoca una suspensión (los strikes vuelven a cero).
  vigente boolean not null default true,
  creado_en timestamptz not null default now()
);

create index strikes_vigentes on public.strikes (persona_id) where vigente;

create table public.suspensiones (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references public.perfiles (id) on delete cascade,
  nivel smallint not null check (nivel >= 1),
  desde timestamptz not null default now(),
  hasta timestamptz not null,
  check (hasta > desde)
);

create index suspensiones_por_persona on public.suspensiones (persona_id, hasta desc);

-- Reportes de mal comportamiento (al cancelar con justificación).
create table public.reportes (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null references public.perfiles (id) on delete cascade,
  sobre_id uuid not null references public.perfiles (id) on delete cascade,
  viaje_id uuid references public.viajes (id) on delete set null,
  motivo text not null check (char_length(btrim(motivo)) between 3 and 300),
  creado_en timestamptz not null default now(),
  revisado_en timestamptz
);

alter table public.billeteras enable row level security;
alter table public.movimientos enable row level security;
alter table public.comisiones enable row level security;
alter table public.strikes enable row level security;
alter table public.suspensiones enable row level security;
alter table public.reportes enable row level security;

revoke insert, update, delete, truncate on
  public.billeteras, public.movimientos, public.comisiones, public.strikes, public.suspensiones, public.reportes
  from anon, authenticated;
revoke select on
  public.billeteras, public.movimientos, public.comisiones, public.strikes, public.suspensiones, public.reportes
  from anon;

create policy "billeteras: la propia" on public.billeteras for select to authenticated
  using (persona_id = (select auth.uid()));
create policy "movimientos: los propios" on public.movimientos for select to authenticated
  using (persona_id = (select auth.uid()));
create policy "comisiones: los administradores" on public.comisiones for select to authenticated
  using (privado.soy_admin());
create policy "strikes: los propios y los administradores" on public.strikes for select to authenticated
  using (persona_id = (select auth.uid()) or privado.soy_admin());
create policy "suspensiones: las propias y los administradores" on public.suspensiones for select to authenticated
  using (persona_id = (select auth.uid()) or privado.soy_admin());
create policy "reportes: quien reporta y los administradores" on public.reportes for select to authenticated
  using (autor_id = (select auth.uid()) or privado.soy_admin());

-- ---------------------------------------------------------------------------
-- Funciones internas de dinero y strikes
-- ---------------------------------------------------------------------------

-- Único lugar donde cambia un saldo: bloquea la billetera, revisa que no quede
-- negativa y deja el movimiento con el saldo resultante.
create function privado.mover_saldo(
  p_persona uuid, p_monto integer, p_tipo public.tipo_movimiento, p_descripcion text,
  p_viaje uuid default null, p_puesto uuid default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_saldo integer;
begin
  if p_monto is null or p_monto = 0 then
    return null;
  end if;
  insert into public.billeteras (persona_id) values (p_persona) on conflict (persona_id) do nothing;
  select saldo into v_saldo from public.billeteras where persona_id = p_persona for update;
  if v_saldo + p_monto < 0 then
    raise exception 'Saldo insuficiente. Recarga tu billetera.';
  end if;
  update public.billeteras set saldo = v_saldo + p_monto, actualizado_en = now() where persona_id = p_persona;
  insert into public.movimientos (persona_id, tipo, monto, saldo_despues, descripcion, viaje_id, puesto_id)
  values (p_persona, p_tipo, p_monto, v_saldo + p_monto, p_descripcion, p_viaje, p_puesto);
  return v_saldo + p_monto;
end;
$$;

-- Le paga al conductor un monto bruto: él recibe el 90 % y UniGo el 10 %
-- (misma cuenta que app/lib/comision.ts: comisión redondeada al peso).
create function privado.pagar_conductor(
  p_conductor uuid, p_bruto integer, p_descripcion text, p_viaje uuid default null, p_puesto uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comision integer := round(p_bruto * 10 / 100.0);
begin
  if p_bruto is null or p_bruto <= 0 then
    return;
  end if;
  perform privado.mover_saldo(p_conductor, p_bruto - v_comision, 'ganancia', p_descripcion, p_viaje, p_puesto);
  if v_comision > 0 then
    insert into public.comisiones (monto, viaje_id, puesto_id) values (v_comision, p_viaje, p_puesto);
  end if;
end;
$$;

-- Suma un strike; con 3 vigentes suspende (3, 7, 15 y luego 30 días) y los reinicia.
create function privado.dar_strike(p_persona uuid, p_motivo text, p_viaje uuid default null, p_cupo uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nivel integer;
  v_dias integer;
begin
  insert into public.strikes (persona_id, motivo, viaje_id, cupo_id) values (p_persona, p_motivo, p_viaje, p_cupo);
  if (select count(*) from public.strikes where persona_id = p_persona and vigente) >= 3 then
    v_nivel := 1 + (select count(*) from public.suspensiones where persona_id = p_persona);
    v_dias := case v_nivel when 1 then 3 when 2 then 7 when 3 then 15 else 30 end;
    insert into public.suspensiones (persona_id, nivel, desde, hasta)
    values (p_persona, v_nivel, now(), now() + make_interval(days => v_dias));
    update public.strikes set vigente = false where persona_id = p_persona and vigente;
    -- Suspendido: deja de estar disponible y sus ofertas se retiran.
    update public.perfiles set disponible = false where id = p_persona and disponible;
    update public.ofertas set estado = 'retirada' where conductor_id = p_persona and estado = 'activa';
  end if;
end;
$$;

create function privado.suspendido_hasta(p_persona uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select max(hasta) from public.suspensiones where persona_id = p_persona and hasta > now();
$$;

create function privado.revisar_suspension(p_persona uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_hasta timestamptz := privado.suspendido_hasta(p_persona);
begin
  if v_hasta is not null then
    raise exception 'Tu cuenta está suspendida hasta el %.',
      to_char(v_hasta at time zone 'America/Bogota', 'DD/MM/YYYY HH24:MI');
  end if;
end;
$$;

-- Un puesto ocupa lugar si está aprobado y pagado, o aprobado y aún a tiempo de pagar.
create function privado.ocupa_puesto(p_puesto public.puestos, p_sale_en timestamptz)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_puesto.estado = 'aprobado'
     and (p_puesto.pagado > 0 or now() <= p_sale_en - interval '10 minutes');
$$;

revoke all on function privado.mover_saldo(uuid, integer, public.tipo_movimiento, text, uuid, uuid) from public, anon, authenticated;
revoke all on function privado.pagar_conductor(uuid, integer, text, uuid, uuid) from public, anon, authenticated;
revoke all on function privado.dar_strike(uuid, text, uuid, uuid) from public, anon, authenticated;
revoke all on function privado.suspendido_hasta(uuid) from public, anon;
revoke all on function privado.revisar_suspension(uuid) from public, anon, authenticated;
revoke all on function privado.ocupa_puesto(public.puestos, timestamptz) from public, anon;
grant execute on function privado.suspendido_hasta(uuid) to authenticated;
grant execute on function privado.ocupa_puesto(public.puestos, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Billetera
-- ---------------------------------------------------------------------------

create function public.recargar(p_monto integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_saldo integer;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión primero.';
  end if;
  if p_monto is null or p_monto < 2000 or p_monto > 500000 then
    raise exception 'La recarga debe ser entre $2.000 y $500.000.';
  end if;
  insert into public.billeteras (persona_id) values (auth.uid()) on conflict (persona_id) do nothing;
  select saldo into v_saldo from public.billeteras where persona_id = auth.uid() for update;
  if v_saldo + p_monto > 1000000 then
    raise exception 'Tu saldo no puede pasar de $1.000.000.';
  end if;
  return privado.mover_saldo(auth.uid(), p_monto, 'recarga', 'Recarga de prueba');
end;
$$;

-- ---------------------------------------------------------------------------
-- Viajes por pedido: pago al aceptar, cobro al terminar, cancelación con reglas
-- ---------------------------------------------------------------------------

create or replace function public.aceptar_oferta(p_oferta uuid)
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
  perform privado.revisar_suspension(auth.uid());

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
  select * into v_oferta from public.ofertas where id = p_oferta for update;
  if v_oferta.estado <> 'activa' then
    raise exception 'El conductor retiró esa oferta.';
  end if;

  -- Se paga ahora y el dinero queda retenido en el viaje.
  perform privado.mover_saldo(auth.uid(), -v_oferta.precio, 'pago_viaje', 'Pago del viaje', v_viaje.id);

  begin
    update public.viajes
    set estado = 'aceptado',
        conductor_id = v_oferta.conductor_id,
        precio = v_oferta.precio,
        pago_retenido = v_oferta.precio,
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

  update public.ofertas
  set estado = 'retirada'
  where conductor_id = v_oferta.conductor_id
    and viaje_id <> v_viaje.id
    and estado = 'activa';
end;
$$;

create or replace function public.terminar_viaje(p_viaje uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_viaje public.viajes;
begin
  update public.viajes set estado = 'terminado', terminado_en = now()
  where id = p_viaje and estado = 'en_curso' and conductor_id = auth.uid()
  returning * into v_viaje;
  if v_viaje.id is null then
    raise exception 'No puedes terminar este viaje.';
  end if;
  perform privado.pagar_conductor(v_viaje.conductor_id, v_viaje.pago_retenido, 'Viaje terminado', v_viaje.id);
  update public.viajes set pago_retenido = 0 where id = v_viaje.id;
end;
$$;

-- p_justificacion: si el estudiante cancela por mal comportamiento o algo raro
-- del conductor, no paga ni recibe strike y queda un reporte para revisar.
drop function public.cancelar_viaje(uuid);

create function public.cancelar_viaje(p_viaje uuid, p_justificacion text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_viaje public.viajes;
  v_justificacion text := nullif(btrim(coalesce(p_justificacion, '')), '');
  v_cobro integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión primero.';
  end if;
  select * into v_viaje from public.viajes where id = p_viaje for update;
  if v_viaje.id is null
     or not (
       (v_viaje.estado = 'solicitado' and v_viaje.estudiante_id = auth.uid())
       or (v_viaje.estado = 'aceptado' and auth.uid() in (v_viaje.estudiante_id, v_viaje.conductor_id))
     ) then
    raise exception 'No puedes cancelar este viaje.';
  end if;

  if v_viaje.estado = 'aceptado' then
    if auth.uid() = v_viaje.estudiante_id then
      if v_justificacion is not null then
        if char_length(v_justificacion) < 3 then
          raise exception 'Cuéntanos qué pasó (al menos unas palabras).';
        end if;
        insert into public.reportes (autor_id, sobre_id, viaje_id, motivo)
        values (v_viaje.estudiante_id, v_viaje.conductor_id, v_viaje.id, left(v_justificacion, 300));
      else
        v_cobro := round(v_viaje.pago_retenido * 20 / 100.0);
        perform privado.dar_strike(v_viaje.estudiante_id, 'Canceló un viaje con el conductor en camino', v_viaje.id);
      end if;
      perform privado.mover_saldo(v_viaje.estudiante_id, v_viaje.pago_retenido - v_cobro, 'reembolso_viaje',
                                  case when v_cobro > 0 then 'Devolución del viaje cancelado (menos 20 %)' else 'Devolución del viaje cancelado' end,
                                  v_viaje.id);
      perform privado.pagar_conductor(v_viaje.conductor_id, v_cobro, 'Compensación por cancelación', v_viaje.id);
    else
      perform privado.mover_saldo(v_viaje.estudiante_id, v_viaje.pago_retenido, 'reembolso_viaje',
                                  'Devolución: el conductor canceló', v_viaje.id);
      perform privado.dar_strike(v_viaje.conductor_id, 'Canceló un viaje aceptado', v_viaje.id);
    end if;
  end if;

  update public.viajes
  set estado = 'cancelado', cancelado_en = now(), cancelado_por = auth.uid(), pago_retenido = 0
  where id = p_viaje;
  update public.ofertas set estado = 'rechazada' where viaje_id = p_viaje and estado = 'activa';
end;
$$;

revoke all on function public.recargar(integer) from public, anon;
revoke all on function public.cancelar_viaje(uuid, text) from public, anon;
grant execute on function public.recargar(integer) to authenticated;
grant execute on function public.cancelar_viaje(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Cupos: pagar el puesto, dejarlo, cancelar, salir y llegar con dinero
-- ---------------------------------------------------------------------------

create function public.pagar_puesto(p_cupo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cupo public.cupos;
  v_puesto public.puestos;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión primero.';
  end if;
  select * into v_cupo from public.cupos where id = p_cupo for update;
  select * into v_puesto from public.puestos where cupo_id = p_cupo and estudiante_id = auth.uid() for update;
  if v_cupo.id is null or v_puesto.id is null or v_puesto.estado <> 'aprobado' or v_cupo.estado <> 'publicado' then
    raise exception 'No tienes un puesto aprobado en este cupo.';
  end if;
  if v_puesto.pagado > 0 then
    raise exception 'Ya pagaste este puesto.';
  end if;
  if now() > v_cupo.sale_en - interval '10 minutes' then
    raise exception 'Ya pasó el límite para pagar (10 minutos antes de la salida).';
  end if;
  perform privado.mover_saldo(auth.uid(), -v_cupo.precio, 'pago_puesto', 'Pago del puesto en un cupo', null, v_puesto.id);
  update public.puestos set pagado = v_cupo.precio, pagado_en = now() where id = v_puesto.id;
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
  where cupo_id = p_cupo and estudiante_id = auth.uid() and estado in ('pendiente', 'aprobado')
  for update;
  if v_puesto.id is null then
    raise exception 'No tienes una solicitud activa en este cupo.';
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

create or replace function public.cancelar_cupo(p_cupo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cupo public.cupos;
  v_puesto public.puestos;
  v_habia_pagos boolean := false;
begin
  select * into v_cupo from public.cupos
  where id = p_cupo and conductor_id = auth.uid() and estado = 'publicado'
  for update;
  if v_cupo.id is null then
    raise exception 'No puedes cancelar este cupo.';
  end if;
  for v_puesto in
    select * from public.puestos where cupo_id = p_cupo and estado = 'aprobado' and pagado > 0 for update
  loop
    v_habia_pagos := true;
    perform privado.mover_saldo(v_puesto.estudiante_id, v_puesto.pagado, 'reembolso_puesto',
                                'Devolución: el conductor canceló el cupo', null, v_puesto.id);
  end loop;
  if v_habia_pagos then
    perform privado.dar_strike(auth.uid(), 'Canceló un cupo con puestos pagados', null, p_cupo);
  end if;

  update public.cupos set estado = 'cancelado', cancelado_en = now() where id = p_cupo;
  update public.puestos set estado = 'cancelado', decidido_en = now(), pagado = 0
  where cupo_id = p_cupo and estado in ('pendiente', 'aprobado');
end;
$$;

create or replace function public.iniciar_cupo(p_cupo uuid)
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
  if not exists (select 1 from public.puestos where cupo_id = p_cupo and estado = 'aprobado' and pagado > 0) then
    raise exception 'Aún no tienes estudiantes con el puesto pagado. Si no vas a salir, cancela el cupo.';
  end if;
  update public.cupos set estado = 'en_curso', iniciado_en = now() where id = p_cupo;
  -- Aprobados que no pagaron pierden el puesto; pendientes quedan rechazados.
  update public.puestos set estado = 'sin_pago', decidido_en = now()
  where cupo_id = p_cupo and estado = 'aprobado' and pagado = 0;
  update public.puestos set estado = 'rechazado', decidido_en = now()
  where cupo_id = p_cupo and estado = 'pendiente';
end;
$$;

create or replace function public.terminar_cupo(p_cupo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cupo public.cupos;
  v_puesto public.puestos;
begin
  update public.cupos set estado = 'terminado', terminado_en = now()
  where id = p_cupo and conductor_id = auth.uid() and estado = 'en_curso'
  returning * into v_cupo;
  if v_cupo.id is null then
    raise exception 'No puedes terminar este cupo.';
  end if;
  for v_puesto in
    select * from public.puestos where cupo_id = p_cupo and estado = 'aprobado' and pagado > 0
  loop
    perform privado.pagar_conductor(v_cupo.conductor_id, v_puesto.pagado, 'Puesto en un cupo terminado', null, v_puesto.id);
  end loop;
end;
$$;

-- Aprobar y contar puestos libres ya no cuenta a quien no pagó a tiempo.
create or replace function public.responder_puesto(p_puesto uuid, p_aprobar boolean)
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
    select count(*) from public.puestos p where p.cupo_id = v_cupo.id and privado.ocupa_puesto(p, v_cupo.sale_en)
  ) >= v_cupo.puestos then
    raise exception 'Ya no quedan puestos en este cupo.';
  end if;

  update public.puestos
  set estado = case when p_aprobar then 'aprobado'::public.estado_puesto else 'rechazado'::public.estado_puesto end,
      decidido_en = now()
  where id = p_puesto;
end;
$$;

create or replace function public.puestos_libres(p_cupos uuid[])
returns table (cupo_id uuid, libres integer)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id,
         greatest(0, c.puestos - (select count(*)::integer from public.puestos p
                                  where p.cupo_id = c.id and privado.ocupa_puesto(p, c.sale_en)))
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

-- pedir_puesto: igual a la de 010, más la suspensión y el conteo nuevo.
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
      and p.estado in ('pendiente', 'aprobado')
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

revoke all on function public.pagar_puesto(uuid) from public, anon;
grant execute on function public.pagar_puesto(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Suspensión: no se pide, no se oferta, no se publica ni se pone disponible
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
  perform privado.revisar_suspension(new.estudiante_id);
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
  perform privado.revisar_suspension(new.conductor_id);
  if privado.tiene_cupo_activo(new.conductor_id) then
    raise exception 'Tienes un cupo publicado: no puedes ofertar en otros viajes.';
  end if;
  return new;
end;
$$;

create or replace function privado.revisar_verificacion_al_publicar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform privado.revisar_suspension(new.conductor_id);
  if not privado.conductor_verificado(new.conductor_id) then
    raise exception 'Tus documentos aún no están aprobados.';
  end if;
  return new;
end;
$$;

create or replace function public.cambiar_disponibilidad(p_disponible boolean)
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
  if p_disponible and not privado.conductor_verificado(auth.uid()) then
    raise exception 'Tus documentos aún no están aprobados.';
  end if;
  if p_disponible then
    perform privado.revisar_suspension(auth.uid());
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

-- Saldo en vivo en la pantalla de la billetera.
alter publication supabase_realtime add table public.billeteras;
