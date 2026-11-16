-- 025 · Retiros manuales por Nequi. Mínimo $20.000 y plazo máximo de siete
-- días. Se aparta el importe al pedirlo; rechazarlo lo devuelve una sola vez.
create type public.estado_retiro as enum ('solicitado','pagado','rechazado');
create table public.retiros (
  id uuid primary key default gen_random_uuid(),
  conductor_id uuid not null references public.perfiles(id),
  monto integer not null check(monto >= 20000),
  nequi text not null check(nequi ~ '^3[0-9]{9}$'),
  estado public.estado_retiro not null default 'solicitado',
  simulado boolean not null,
  solicitado_en timestamptz not null default now(),
  plazo_hasta timestamptz not null default (now() + interval '7 days'),
  resuelto_en timestamptz,
  revisado_por uuid references public.perfiles(id),
  documentos_revisados_en timestamptz,
  referencia_pago text unique check(char_length(referencia_pago) between 6 and 100),
  motivo text check(char_length(motivo) between 3 and 300)
);
create index retiros_por_conductor on public.retiros(conductor_id, solicitado_en desc);
create index retiros_por_revisar on public.retiros(plazo_hasta) where estado = 'solicitado';
alter table public.retiros enable row level security;
revoke all on public.retiros from public, anon, authenticated;
grant select on public.retiros to authenticated;
create policy "retiros: propios y administradores" on public.retiros for select to authenticated
using(conductor_id=(select auth.uid()) or privado.soy_admin());

-- Solo ganancias del conductor, no las recargas del estudiante. Si se gastó
-- parte de ellas, el saldo actual es el segundo límite.
create function privado.disponible_para_retirar(p_persona uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select greatest(0,least(
    coalesce((select saldo from public.billeteras where persona_id=p_persona),0),
    coalesce((select sum(monto) from public.movimientos where persona_id=p_persona
      and tipo in ('ganancia','retiro_reservado','retiro_devuelto')),0)
  ))::integer;
$$;
revoke all on function privado.disponible_para_retirar(uuid) from public, anon, authenticated;

create function public.opciones_de_retiro()
returns table(disponible integer, simulado boolean, documentacion_lista boolean)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero.'; end if;
  return query select privado.disponible_para_retirar(auth.uid()),
    (a.recarga_simulada or not a.saldos_de_prueba_revisados or coalesce(a.secreto_eventos not like 'prod_events_%',true)),
    privado.conductor_verificado(auth.uid())
    from privado.ajustes_pago a;
end;
$$;
revoke all on function public.opciones_de_retiro() from public, anon;
grant execute on function public.opciones_de_retiro() to authenticated;

create function public.solicitar_retiro(p_monto integer, p_nequi text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_perfil public.perfiles; v_id uuid; v_simulado boolean;
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero.'; end if;
  select * into v_perfil from public.perfiles where id=auth.uid() for update;
  if v_perfil.rol is distinct from 'conductor' then raise exception 'Cambia a modo conductor para retirar tus ganancias.'; end if;
  if not privado.conductor_verificado(auth.uid()) then raise exception 'Primero deben aprobar tus documentos de conductor.'; end if;
  if p_monto is null or p_monto < 20000 then raise exception 'El retiro mínimo es $20.000.'; end if;
  if p_nequi is null or p_nequi !~ '^3[0-9]{9}$' then raise exception 'El número de Nequi debe tener 10 dígitos y empezar por 3.'; end if;
  perform 1 from public.billeteras where persona_id=auth.uid() for update;
  if p_monto > privado.disponible_para_retirar(auth.uid()) then raise exception 'No tienes esas ganancias disponibles para retirar.'; end if;
  select simulado into v_simulado from public.opciones_de_retiro();
  insert into public.retiros(conductor_id,monto,nequi,simulado)
  values(auth.uid(),p_monto,p_nequi,v_simulado) returning id into v_id;
  perform privado.mover_saldo(auth.uid(),-p_monto,'retiro_reservado','Dinero apartado para retiro a Nequi');
  return v_id;
end;
$$;
revoke all on function public.solicitar_retiro(integer,text) from public, anon;
grant execute on function public.solicitar_retiro(integer,text) to authenticated;

create function public.revisar_retiro(p_retiro uuid,p_pagado boolean,p_documentacion_verificada boolean default false,
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
  if p_pagado then
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
revoke all on function public.revisar_retiro(uuid,boolean,boolean,text,text) from public, anon;
grant execute on function public.revisar_retiro(uuid,boolean,boolean,text,text) to authenticated;
