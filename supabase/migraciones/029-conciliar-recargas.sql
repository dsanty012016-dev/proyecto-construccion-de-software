alter table public.movimientos add column recarga_id uuid references public.recargas(id) on delete set null;
create unique index movimientos_por_recarga on public.movimientos(recarga_id) where recarga_id is not null;

alter table public.recargas add column revision_resultado text
  check (revision_resultado in ('sin_ajuste','devolucion_externa')),
  add column revision_monto bigint check (revision_monto > 0),
  add column revision_resuelta_en timestamptz,
  add constraint recargas_revision_resuelta check (
    (revision_resultado is null and revision_monto is null and revision_resuelta_en is null)
    or (requiere_revision and revision_resultado is not null and revision_resuelta_en is not null
      and (revision_resultado='devolucion_externa')=(revision_monto is not null))
  );

alter table privado.incidencias_pago
  drop constraint incidencias_pago_motivo_check,
  add constraint incidencias_pago_motivo_check check (motivo in (
    'referencia_desconocida','monto_distinto','limite_saldo','anulacion','pago_adicional',
    'transaccion_reutilizada','estado_inconsistente','ambiente_distinto'
  )),
  add column resultado text check (resultado in ('sin_ajuste','devolucion_externa')),
  add column monto_devuelto integer check (monto_devuelto > 0),
  add column comprobante text check (char_length(btrim(comprobante)) between 3 and 100),
  add constraint incidencias_resultado_completo check (
    (resultado is null and monto_devuelto is null and comprobante is null)
    or (resuelta_en is not null and resultado is not null
      and ((resultado='sin_ajuste' and monto_devuelto is null and comprobante is null)
        or (resultado='devolucion_externa' and monto_devuelto is not null and comprobante is not null)))
  );
create unique index incidencias_comprobante_devolucion
  on privado.incidencias_pago(comprobante) where comprobante is not null;
create index incidencias_abiertas_por_recarga
  on privado.incidencias_pago(recarga_id) where resuelta_en is null and recarga_id is not null;

create function privado.mover_saldo(
  p_persona uuid,p_monto integer,p_tipo public.tipo_movimiento,p_descripcion text,
  p_viaje uuid,p_puesto uuid,p_recarga uuid
)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_saldo integer;
begin
  if p_monto is null or p_monto=0 then return null; end if;
  insert into public.billeteras(persona_id) values(p_persona) on conflict do nothing;
  select saldo into v_saldo from public.billeteras where persona_id=p_persona for update;
  if v_saldo+p_monto<0 then raise exception 'Saldo insuficiente. Recarga tu billetera.'; end if;
  update public.billeteras set saldo=v_saldo+p_monto,actualizado_en=now() where persona_id=p_persona;
  insert into public.movimientos(persona_id,tipo,monto,saldo_despues,descripcion,viaje_id,puesto_id,recarga_id)
  values(p_persona,p_tipo,p_monto,v_saldo+p_monto,p_descripcion,p_viaje,p_puesto,p_recarga);
  return v_saldo+p_monto;
end;
$$;
revoke all on function privado.mover_saldo(uuid,integer,public.tipo_movimiento,text,uuid,uuid,uuid) from public,anon,authenticated;

create or replace function privado.mover_saldo(
  p_persona uuid,p_monto integer,p_tipo public.tipo_movimiento,p_descripcion text,
  p_viaje uuid default null,p_puesto uuid default null
)
returns integer language sql security definer set search_path = '' as $$
  select privado.mover_saldo(p_persona,p_monto,p_tipo,p_descripcion,p_viaje,p_puesto,null);
$$;

-- Un reintento del mismo aviso no borra el diagnóstico que vio el estudiante.
create or replace function privado.revisar_pago(p_recarga uuid,p_transaccion text,p_motivo text)
returns text language plpgsql security definer set search_path = '' as $$
begin
  insert into privado.incidencias_pago(recarga_id,transaccion,motivo)
  values(p_recarga,p_transaccion,p_motivo) on conflict do nothing;
  if found then
    update public.recargas set requiere_revision=true,revision_resultado=null,
      revision_monto=null,revision_resuelta_en=null where id=p_recarga;
  end if;
  return 'en_revision';
end;
$$;

create function public.resolver_incidencia_pago(
  p_incidencia uuid,p_verificada boolean,p_nota text,p_resultado text,
  p_monto integer default null,p_comprobante text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_persona uuid := auth.uid();
  v_recarga uuid;
  v_monto_devuelto bigint;
begin
  if v_persona is null or privado.soy_admin() is distinct from true then
    raise exception 'Solo los administradores revisan pagos.';
  end if;
  if p_verificada is distinct from true then raise exception 'Confirma la comparación de la operación antes de cerrar.'; end if;
  if p_nota is null or char_length(btrim(p_nota)) not between 3 and 500 then
    raise exception 'Escribe el resultado de la revisión en 3 a 500 caracteres.';
  end if;
  if p_resultado='devolucion_externa' then
    if p_monto is null or p_monto<=0 or p_comprobante is null or char_length(btrim(p_comprobante)) not between 3 and 100 then
      raise exception 'Registra el monto y el comprobante de la devolución realizada.';
    end if;
  elsif p_resultado is distinct from 'sin_ajuste' or p_monto is not null or p_comprobante is not null then
    raise exception 'Selecciona un resultado de conciliación válido.';
  end if;

  select recarga_id into v_recarga from privado.incidencias_pago where id=p_incidencia;
  -- El webhook toma primero la recarga. El cierre conserva el mismo orden.
  perform 1 from public.recargas where id=v_recarga for update;
  begin
    update privado.incidencias_pago set resuelta_en=now(),revisada_por=v_persona,nota_revision=btrim(p_nota),
      resultado=p_resultado,monto_devuelto=p_monto,comprobante=btrim(p_comprobante)
    where id=p_incidencia and resuelta_en is null;
    if not found then raise exception 'La incidencia ya fue cerrada o no está disponible.'; end if;
  exception when unique_violation then
    raise exception 'Ese comprobante ya está asociado a otra devolución.';
  end;
  if v_recarga is not null and not exists (
    select 1 from privado.incidencias_pago where recarga_id=v_recarga and resuelta_en is null
  ) then
    select sum(monto_devuelto) into v_monto_devuelto from privado.incidencias_pago where recarga_id=v_recarga;
    update public.recargas set revision_resuelta_en=now(),revision_monto=v_monto_devuelto,
      revision_resultado=case when v_monto_devuelto is null then 'sin_ajuste' else 'devolucion_externa' end
    where id=v_recarga;
  end if;
end;
$$;
revoke all on function public.resolver_incidencia_pago(uuid,boolean,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.resolver_incidencia_pago(uuid,boolean,text,text,integer,text) to authenticated;

create or replace function public.cerrar_incidencia_pago(p_incidencia uuid,p_verificada boolean,p_nota text)
returns void language sql security invoker set search_path = '' as $$
  select public.resolver_incidencia_pago(p_incidencia,p_verificada,p_nota,'sin_ajuste');
$$;

create function public.incidencias_conciliacion(p_resueltas boolean,p_pagina integer)
returns table (
  id uuid,recarga_id uuid,transaccion text,motivo text,detectado_en timestamptz,
  resuelta_en timestamptz,revisada_por uuid,responsable text,nota_revision text,
  monto integer,estado_recarga text,transaccion_recarga text,total bigint,
  resultado text,monto_devuelto integer,comprobante text,movimiento_id uuid
)
language sql stable security definer set search_path = '' as $$
  -- El lector anterior valida que la sesión pertenezca a un administrador.
  select h.id,h.recarga_id,h.transaccion,h.motivo,h.detectado_en,h.resuelta_en,h.revisada_por,h.responsable,
    h.nota_revision,h.monto,h.estado_recarga,h.transaccion_recarga,h.total,i.resultado,i.monto_devuelto,i.comprobante,m.id
  from public.historial_incidencias_pago(p_resueltas,p_pagina) h
  join privado.incidencias_pago i on i.id=h.id
  left join public.movimientos m on m.recarga_id=h.recarga_id
  order by coalesce(h.resuelta_en,h.detectado_en) desc,h.id;
$$;
revoke all on function public.incidencias_conciliacion(boolean,integer) from public,anon,authenticated;
grant execute on function public.incidencias_conciliacion(boolean,integer) to authenticated;

create or replace function privado.confirmar_pago_verificado(p_evento jsonb, p_transaccion jsonb)
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
  -- Las referencias sin ambiente son heredadas del piloto de pruebas.
  if coalesce(v_recarga.ambiente,'test') <> v_evento.ambiente then
    return privado.revisar_pago(v_id,v_tx,'ambiente_distinto');
  end if;
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
      'Recarga con ' || privado.nombre_de_medio(p_transaccion->>'payment_method_type'),null,null,v_id);
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
