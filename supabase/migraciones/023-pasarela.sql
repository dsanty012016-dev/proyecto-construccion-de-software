-- 023 · Pasarela de pagos: recargas con Wompi
-- Reglas en docs/reglas.md y pasos para activarla en docs/pagos.md. Resumen:
-- - La billetera y toda su lógica (012) siguen igual; lo que cambia es de
--   dónde sale el saldo: de un pago real en Wompi y no del botón de prueba.
-- - El estudiante elige un monto (desde $20.000), la app crea una recarga
--   "pendiente" y lo manda a pagar a la página de Wompi con esa referencia.
-- - Wompi avisa el resultado con un evento firmado. La firma se revisa AQUÍ,
--   en la base, con el secreto de eventos: ni la app ni nadie más puede dar
--   saldo sin un evento que de verdad venga de Wompi.
-- - Cada recarga se acredita una sola vez aunque el aviso llegue repetido.
-- - La comisión de la pasarela la asume UniGo: quien paga $20.000 recibe $20.000.
-- - La recarga de prueba (012) sigue mientras no haya pagos reales; se apaga
--   con un interruptor (ver "Activar" al final).

create type public.estado_recarga as enum ('pendiente', 'aprobada', 'rechazada');

-- Cada intento de recarga. Su id es la referencia que ve Wompi.
create table public.recargas (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references public.perfiles (id) on delete cascade,
  monto integer not null check (monto between 20000 and 500000),
  estado public.estado_recarga not null default 'pendiente',
  -- De Wompi solo se guarda el número de la transacción y el medio de pago
  -- (Nequi, PSE...): ningún dato de quien paga.
  transaccion text unique check (char_length(transaccion) between 1 and 100),
  medio text check (char_length(medio) between 1 and 40),
  creada_en timestamptz not null default now(),
  resuelta_en timestamptz
);

create index recargas_por_persona on public.recargas (persona_id, creada_en desc);

alter table public.recargas enable row level security;
revoke insert, update, delete, truncate, trigger, references on public.recargas from anon, authenticated;
revoke select on public.recargas from anon;

create policy "recargas: las propias y los administradores" on public.recargas for select to authenticated
  using (persona_id = (select auth.uid()) or privado.soy_admin());

-- Ajustes de pagos: una sola fila. No se lee ni se escribe desde la app.
create table privado.ajustes_pago (
  unico boolean primary key default true check (unico),
  -- ¿Sigue abierto el botón de recarga de prueba?
  recarga_simulada boolean not null default true,
  -- Secreto de eventos de Wompi (el que firma sus avisos). Sin él no se acredita nada.
  secreto_eventos text check (secreto_eventos is null or char_length(secreto_eventos) >= 20)
);

insert into privado.ajustes_pago default values;

alter table privado.ajustes_pago enable row level security;
revoke all on privado.ajustes_pago from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Recarga de prueba: igual que en 012, pero se puede apagar
-- ---------------------------------------------------------------------------

create or replace function public.recargar(p_monto integer)
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
  if not (select recarga_simulada from privado.ajustes_pago) then
    raise exception 'Las recargas de prueba están cerradas. Recarga pagando con Wompi.';
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
-- Recarga con Wompi
-- ---------------------------------------------------------------------------

-- Abre una recarga pendiente y devuelve su id, que es la referencia del pago.
create function public.iniciar_recarga(p_monto integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_saldo integer;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión primero.';
  end if;
  if p_monto is null or p_monto < 20000 or p_monto > 500000 then
    raise exception 'La recarga debe ser entre $20.000 y $500.000.';
  end if;
  select saldo into v_saldo from public.billeteras where persona_id = auth.uid();
  if coalesce(v_saldo, 0) + p_monto > 1000000 then
    raise exception 'Tu saldo no puede pasar de $1.000.000.';
  end if;
  -- Para que nadie llene la tabla de intentos sin pagar.
  if (select count(*) from public.recargas
      where persona_id = auth.uid() and estado = 'pendiente' and creada_en > now() - interval '1 hour') >= 5 then
    raise exception 'Tienes varias recargas sin terminar. Espera unos minutos e intenta de nuevo.';
  end if;
  insert into public.recargas (persona_id, monto) values (auth.uid(), p_monto) returning id into v_id;
  return v_id;
end;
$$;

-- Cómo se le dice a cada medio de pago en los movimientos.
create function privado.nombre_de_medio(p_medio text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_medio
    when 'NEQUI' then 'Nequi'
    when 'PSE' then 'PSE'
    when 'CARD' then 'tarjeta'
    when 'BANCOLOMBIA_TRANSFER' then 'Bancolombia'
    when 'BANCOLOMBIA_QR' then 'QR Bancolombia'
    when 'DAVIPLATA' then 'Daviplata'
    else 'Wompi'
  end;
$$;

-- Recibe el aviso de Wompi tal cual llegó (app/api/v1/pagos/wompi). Revisa la
-- firma y, si el pago fue aprobado, pone el saldo. Devuelve qué pasó:
-- 'aprobada', 'rechazada', 'pendiente', 'ignorada' o 'monto_distinto'.
create function public.confirmar_recarga_wompi(p_evento jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secreto text;
  v_propiedades jsonb;
  v_propiedad text;
  v_cadena text := '';
  v_tx jsonb;
  v_id uuid;
  v_recarga public.recargas;
  v_estado text;
begin
  select secreto_eventos into v_secreto from privado.ajustes_pago;
  if v_secreto is null then
    raise exception 'La pasarela de pagos no está configurada.';
  end if;

  -- 1. La firma. Wompi dice qué datos firmó (signature.properties); se pegan
  --    en ese orden, luego la hora del evento y el secreto, y se saca SHA-256.
  v_propiedades := p_evento #> '{signature,properties}';
  if jsonb_typeof(p_evento) is distinct from 'object'
     or jsonb_typeof(v_propiedades) is distinct from 'array'
     or jsonb_array_length(v_propiedades) not between 1 and 20 then
    raise exception 'Evento inválido.';
  end if;
  -- La firma tiene que cubrir lo que aquí se usa para dar saldo.
  if not (v_propiedades @> '["transaction.id", "transaction.status", "transaction.amount_in_cents"]'::jsonb) then
    raise exception 'Evento inválido.';
  end if;
  for v_propiedad in select jsonb_array_elements_text(v_propiedades) loop
    v_cadena := v_cadena || coalesce(p_evento #>> (array['data'] || string_to_array(v_propiedad, '.')), '');
  end loop;
  v_cadena := v_cadena || coalesce(p_evento ->> 'timestamp', '') || v_secreto;
  if encode(sha256(convert_to(v_cadena, 'UTF8')), 'hex') is distinct from lower(p_evento #>> '{signature,checksum}') then
    raise exception 'Firma inválida.';
  end if;

  -- 2. Solo interesan los cambios de una transacción que sea una recarga nuestra.
  if p_evento ->> 'event' is distinct from 'transaction.updated' then
    return 'ignorada';
  end if;
  v_tx := p_evento #> '{data,transaction}';
  begin
    v_id := (v_tx ->> 'reference')::uuid;
  exception when others then
    return 'ignorada';
  end;
  if v_id is null then
    return 'ignorada';
  end if;
  select * into v_recarga from public.recargas where id = v_id for update;
  if not found then
    return 'ignorada';
  end if;
  -- Ya resuelta: el aviso llegó repetido. No se acredita dos veces.
  if v_recarga.estado <> 'pendiente' then
    return v_recarga.estado::text;
  end if;

  -- 3. El resultado.
  v_estado := v_tx ->> 'status';
  if v_estado = 'APPROVED' then
    -- Debe ser el monto de la recarga, en pesos (Wompi lo manda en centavos).
    if (v_tx ->> 'currency') is distinct from 'COP'
       or (v_tx ->> 'amount_in_cents') is distinct from (v_recarga.monto::bigint * 100)::text then
      return 'monto_distinto';
    end if;
    begin
      update public.recargas
      set estado = 'aprobada', transaccion = left(v_tx ->> 'id', 100),
          medio = left(v_tx ->> 'payment_method_type', 40), resuelta_en = now()
      where id = v_id;
    exception when unique_violation then
      -- Esa transacción de Wompi ya pagó otra recarga.
      return 'ignorada';
    end;
    perform privado.mover_saldo(
      v_recarga.persona_id, v_recarga.monto, 'recarga',
      'Recarga con ' || privado.nombre_de_medio(v_tx ->> 'payment_method_type')
    );
    perform privado.avisar(
      array[v_recarga.persona_id], 'Recarga lista',
      'Ya tienes ' || privado.pesos(v_recarga.monto) || ' más en tu billetera.', '/billetera'
    );
    return 'aprobada';
  elsif v_estado in ('DECLINED', 'VOIDED', 'ERROR') then
    update public.recargas set estado = 'rechazada', resuelta_en = now() where id = v_id;
    return 'rechazada';
  end if;
  return 'pendiente';
end;
$$;

revoke all on function privado.nombre_de_medio(text) from public, anon, authenticated;
revoke all on function public.iniciar_recarga(integer) from public, anon;
grant execute on function public.iniciar_recarga(integer) to authenticated;
-- La llama la app sin sesión (el aviso lo manda Wompi, no una persona): por
-- eso se abre a todos y la protege la firma.
revoke all on function public.confirmar_recarga_wompi(jsonb) from public;
grant execute on function public.confirmar_recarga_wompi(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Activar (NO va en esta migración; se ejecuta a mano, ver docs/pagos.md)
-- ---------------------------------------------------------------------------
-- 1. Guardar el secreto de eventos de Wompi:
--      update privado.ajustes_pago set secreto_eventos = '<secreto de eventos>';
-- 2. Cuando entren pagos reales, cerrar la recarga de prueba:
--      update privado.ajustes_pago set recarga_simulada = false;
