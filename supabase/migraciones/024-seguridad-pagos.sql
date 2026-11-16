-- 024 · El aviso firmado no autentica su referencia: solo un servidor que
-- consultó Wompi por ID puede confirmar la recarga. Nunca desde la app.
alter type public.tipo_movimiento add value 'retiro_reservado';
alter type public.tipo_movimiento add value 'retiro_devuelto';
alter table public.recargas add column requiere_revision boolean not null default false;
alter table privado.ajustes_pago add column saldos_de_prueba_revisados boolean not null default false;

-- Desactivar el camino antiguo, incluso si se llama directamente por REST.
alter function public.confirmar_recarga_wompi(jsonb) set schema privado;
revoke all on function privado.confirmar_recarga_wompi(jsonb) from public, anon, authenticated;
create or replace function privado.confirmar_recarga_wompi(p_evento jsonb)
returns text language plpgsql set search_path = '' as $$
begin raise exception 'La confirmación necesita consultar la transacción en Wompi.'; end;
$$;

create table privado.incidencias_pago (
  id uuid primary key default gen_random_uuid(),
  recarga_id uuid references public.recargas(id),
  transaccion text not null check (char_length(transaccion) between 1 and 100),
  motivo text not null check (motivo in ('referencia_desconocida', 'monto_distinto', 'limite_saldo', 'anulacion', 'pago_adicional', 'transaccion_reutilizada', 'estado_inconsistente')),
  detectado_en timestamptz not null default now(),
  unique (transaccion, motivo)
);
alter table privado.incidencias_pago enable row level security;
revoke all on privado.incidencias_pago from public, anon, authenticated;

create function privado.revisar_pago(p_recarga uuid, p_transaccion text, p_motivo text)
returns text language plpgsql security definer set search_path = '' as $$
begin
  insert into privado.incidencias_pago(recarga_id, transaccion, motivo)
  values(p_recarga, p_transaccion, p_motivo) on conflict do nothing;
  update public.recargas set requiere_revision = true where id = p_recarga;
  return 'en_revision';
end;
$$;
revoke all on function privado.revisar_pago(uuid, text, text) from public, anon, authenticated;

-- Valida la firma antes de consultar al proveedor. No devuelve secretos.
create function privado.validar_evento_pago(p_evento jsonb)
returns table (transaccion text, ambiente text)
language plpgsql security definer set search_path = '' as $$
declare v_secreto text; v_propiedades jsonb; v_propiedad text; v_cadena text := ''; v_ambiente text;
begin
  select secreto_eventos into v_secreto from privado.ajustes_pago;
  if v_secreto is null then raise exception 'La pasarela de pagos no está configurada.'; end if;
  v_propiedades := p_evento #> '{signature,properties}';
  if jsonb_typeof(p_evento) is distinct from 'object'
     or jsonb_typeof(v_propiedades) is distinct from 'array' then raise exception 'Evento inválido.'; end if;
  if jsonb_array_length(v_propiedades) not between 1 and 20
     or not (v_propiedades @> '["transaction.id","transaction.status","transaction.amount_in_cents"]'::jsonb)
     or jsonb_typeof(p_evento->'timestamp') is distinct from 'number'
     or coalesce(p_evento #>> '{data,transaction,id}', '') !~ '^[A-Za-z0-9_-]{1,100}$' then
    raise exception 'Evento inválido.';
  end if;
  for v_propiedad in select jsonb_array_elements_text(v_propiedades) loop
    v_cadena := v_cadena || coalesce(p_evento #>> (array['data'] || string_to_array(v_propiedad, '.')), '');
  end loop;
  v_cadena := v_cadena || (p_evento->>'timestamp') || v_secreto;
  if encode(sha256(convert_to(v_cadena, 'UTF8')), 'hex') is distinct from lower(p_evento #>> '{signature,checksum}') then
    raise exception 'Firma inválida.';
  end if;
  v_ambiente := case when v_secreto like 'test_events_%' then 'test' when v_secreto like 'prod_events_%' then 'prod' end;
  if v_ambiente is null or p_evento->>'environment' is distinct from v_ambiente then raise exception 'Ambiente de pago inválido.'; end if;
  if v_ambiente = 'prod' and exists(select 1 from privado.ajustes_pago where recarga_simulada or not saldos_de_prueba_revisados) then
    raise exception 'Revisa los saldos de prueba antes de activar pagos reales.';
  end if;
  if p_evento->>'event' = 'transaction.updated' then
    return query select p_evento #>> '{data,transaction,id}', v_ambiente;
  end if;
end;
$$;
revoke all on function privado.validar_evento_pago(jsonb) from public, anon, authenticated;

create function privado.confirmar_pago_verificado(p_evento jsonb, p_transaccion jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_evento record; v_id uuid; v_recarga public.recargas; v_estado text;
  v_tx text; v_saldo integer;
begin
  select * into v_evento from privado.validar_evento_pago(p_evento);
  if not found then return 'ignorada'; end if;
  if jsonb_typeof(p_transaccion) is distinct from 'object'
     or p_transaccion->>'id' is distinct from v_evento.transaccion then
    raise exception 'La transacción consultada no corresponde al aviso.';
  end if;
  v_tx := p_transaccion->>'id';
  -- La referencia y el estado proceden de la consulta autenticada a Wompi,
  -- no de los campos del aviso que el proveedor no incluyó en su firma.
  begin v_id := (p_transaccion->>'reference')::uuid;
  exception when invalid_text_representation then
    perform privado.revisar_pago(null, v_tx, 'referencia_desconocida'); return 'ignorada';
  end;
  select * into v_recarga from public.recargas where id = v_id for update;
  if not found then perform privado.revisar_pago(null, v_tx, 'referencia_desconocida'); return 'ignorada'; end if;
  v_estado := p_transaccion->>'status';
  if v_recarga.estado = 'aprobada' then
    if v_tx <> v_recarga.transaccion then return privado.revisar_pago(v_id, v_tx, 'pago_adicional'); end if;
    if v_estado = 'VOIDED' then return privado.revisar_pago(v_id, v_tx, 'anulacion'); end if;
    if v_estado not in ('APPROVED','PENDING') then return privado.revisar_pago(v_id, v_tx, 'estado_inconsistente'); end if;
    return case when v_recarga.requiere_revision then 'en_revision' else 'aprobada' end;
  end if;
  if v_recarga.estado = 'rechazada' then
    if v_estado = 'APPROVED' then return privado.revisar_pago(v_id, v_tx, 'pago_adicional'); end if;
    return 'rechazada';
  end if;
  if v_recarga.requiere_revision then return 'en_revision'; end if;
  if v_estado = 'APPROVED' then
    if p_transaccion->>'currency' is distinct from 'COP'
       or p_transaccion->>'amount_in_cents' is distinct from (v_recarga.monto::bigint*100)::text then
      return privado.revisar_pago(v_id, v_tx, 'monto_distinto');
    end if;
    if exists(select 1 from public.recargas where transaccion = v_tx and id <> v_id) then
      return privado.revisar_pago(v_id, v_tx, 'transaccion_reutilizada');
    end if;
    -- El bloqueo de billetera serializa las acreditaciones de una persona.
    -- Un pago ya cobrado que supera el tope se conserva para conciliación.
    insert into public.billeteras(persona_id) values(v_recarga.persona_id) on conflict do nothing;
    select saldo into v_saldo from public.billeteras where persona_id = v_recarga.persona_id for update;
    if v_saldo + v_recarga.monto > 1000000 then return privado.revisar_pago(v_id, v_tx, 'limite_saldo'); end if;
    begin
      update public.recargas set estado='aprobada', transaccion=v_tx,
        medio=left(p_transaccion->>'payment_method_type',40), resuelta_en=now() where id=v_id;
    exception when unique_violation then return privado.revisar_pago(v_id, v_tx, 'transaccion_reutilizada'); end;
    perform privado.mover_saldo(v_recarga.persona_id,v_recarga.monto,'recarga',
      'Recarga con ' || privado.nombre_de_medio(p_transaccion->>'payment_method_type'));
    perform privado.avisar(array[v_recarga.persona_id], 'Recarga lista',
      'Ya tienes ' || privado.pesos(v_recarga.monto) || ' más en tu billetera.', '/billetera');
    return 'aprobada';
  elsif v_estado in ('DECLINED','VOIDED','ERROR') then
    update public.recargas set estado='rechazada',resuelta_en=now() where id=v_id;
    return 'rechazada';
  end if;
  return 'pendiente';
end;
$$;
revoke all on function privado.confirmar_pago_verificado(jsonb,jsonb) from public, anon, authenticated;

create function public.incidencias_de_pago()
returns table(id uuid, recarga_id uuid, transaccion text, motivo text, detectado_en timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not privado.soy_admin() then raise exception 'Solo los administradores revisan pagos.'; end if;
  return query select i.id,i.recarga_id,i.transaccion,i.motivo,i.detectado_en from privado.incidencias_pago i order by i.detectado_en desc limit 100;
end;
$$;
revoke all on function public.incidencias_de_pago() from public, anon;
grant execute on function public.incidencias_de_pago() to authenticated;
