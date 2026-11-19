alter table public.retiros add column asignado_a uuid references public.perfiles(id),
  add column asignado_en timestamptz,
  add constraint retiros_asignacion_completa check ((asignado_a is null)=(asignado_en is null));

alter table privado.ajustes_pago add column retiros_reales_habilitados boolean not null default false;

create or replace function public.opciones_de_retiro()
returns table(disponible integer,simulado boolean,documentacion_lista boolean)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero.'; end if;
  return query select privado.disponible_para_retirar(auth.uid()),
    (a.recarga_simulada or not a.saldos_de_prueba_revisados or not a.retiros_reales_habilitados
      or not coalesce(starts_with(a.secreto_eventos,'prod_events_'),false)),
    privado.conductor_verificado(auth.uid())
  from privado.ajustes_pago a;
end;
$$;

create function public.tomar_retiro(p_retiro uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_persona uuid := auth.uid();
begin
  if v_persona is null or privado.soy_admin() is distinct from true then
    raise exception 'Solo los administradores revisan retiros.';
  end if;
  update public.retiros set asignado_en=coalesce(asignado_en,now()),asignado_a=v_persona
  where id=p_retiro and estado='solicitado' and conductor_id<>v_persona
    and (asignado_a is null or asignado_a=v_persona);
  if not found then raise exception 'Este retiro no está disponible para asignártelo.'; end if;
end;
$$;
revoke all on function public.tomar_retiro(uuid) from public,anon,authenticated;
grant execute on function public.tomar_retiro(uuid) to authenticated;

create or replace function public.revisar_retiro(p_retiro uuid,p_pagado boolean,p_documentacion_verificada boolean default false,
  p_referencia text default null,p_motivo text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_retiro public.retiros;
begin
  if auth.uid() is null or not privado.soy_admin() then raise exception 'Solo los administradores revisan retiros.'; end if;
  select * into v_retiro from public.retiros where id=p_retiro for update;
  if v_retiro.id is null then raise exception 'Ese retiro no existe.'; end if;
  if v_retiro.conductor_id=auth.uid() then raise exception 'Otro administrador debe revisar tu retiro.'; end if;
  if v_retiro.estado <> 'solicitado' then
    if (p_pagado and v_retiro.estado='pagado') or (not p_pagado and v_retiro.estado='rechazado') then return; end if;
    raise exception 'Este retiro ya fue resuelto.';
  end if;
  if p_pagado is null then raise exception 'Elige el resultado de la revisión.'; end if;
  if v_retiro.asignado_a is not null and v_retiro.asignado_a<>auth.uid() then
    raise exception 'Otro administrador tiene asignado este retiro.';
  end if;
  if p_pagado then
    if v_retiro.asignado_a is null then raise exception 'Toma la solicitud antes de registrar un pago.'; end if;
    if p_documentacion_verificada is distinct from true or not privado.conductor_verificado(v_retiro.conductor_id) then
      raise exception 'Revisa los documentos y confirma que la cédula y el Nequi pertenecen al conductor.';
    end if;
    if p_referencia is null or char_length(btrim(p_referencia)) not between 6 and 100 then
      raise exception 'Registra la referencia del pago realizado en Nequi.';
    end if;
    -- El pago se hace fuera de UniGo; aquí solo se registra el comprobante.
    begin
      update public.retiros set estado='pagado',referencia_pago=btrim(p_referencia),
        resuelto_en=now(),revisado_por=auth.uid(),documentos_revisados_en=now() where id=p_retiro;
    exception when unique_violation then raise exception 'Esa referencia ya fue usada para otro retiro.'; end;
  else
    if p_motivo is null or char_length(btrim(p_motivo)) not between 3 and 300 then raise exception 'Explica por qué no se aprobó el retiro.'; end if;
    perform privado.mover_saldo(v_retiro.conductor_id,v_retiro.monto,'retiro_devuelto','Devolución: retiro no aprobado');
    update public.retiros set estado='rechazado',motivo=btrim(p_motivo),resuelto_en=now(),revisado_por=auth.uid() where id=p_retiro;
  end if;
end;
$$;
