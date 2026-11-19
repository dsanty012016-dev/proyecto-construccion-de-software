alter table public.documentos_conductor add column vence_el date,
  add constraint vencimiento_solo_licencia check (vence_el is null or tipo='licencia');
create index documentos_por_ruta on public.documentos_conductor(ruta);
create index licencias_por_vencer on public.documentos_conductor(vence_el)
  where tipo='licencia' and estado='aprobado' and vence_el is not null;

create table privado.documentos_reemplazados (
  ruta text primary key,
  detectado_en timestamptz not null default now(),
  eliminar_desde timestamptz not null default (now()+interval '90 days')
);
alter table privado.documentos_reemplazados enable row level security;
revoke all on privado.documentos_reemplazados from public,anon,authenticated;
create index documentos_listos_para_eliminar on privado.documentos_reemplazados(eliminar_desde,ruta);

create function privado.proteger_archivo_documento()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Los registros del mismo conductor pasan en serie, incluido el upsert.
  perform 1 from public.perfiles where id=new.conductor_id for update;
  if exists (select 1 from privado.documentos_reemplazados where ruta=new.ruta) then
    raise exception 'Este archivo ya fue reemplazado. Sube un archivo nuevo.';
  end if;
  if tg_op='UPDATE' and new.ruta is distinct from old.ruta then new.vence_el:=null; end if;
  return new;
end;
$$;
revoke all on function privado.proteger_archivo_documento() from public,anon,authenticated;
create trigger proteger_archivo_documento before insert or update of ruta on public.documentos_conductor
for each row execute function privado.proteger_archivo_documento();

create function privado.registrar_archivo_reemplazado()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.ruta is distinct from new.ruta and not exists (
    select 1 from public.documentos_conductor where ruta=old.ruta
  ) then
    insert into privado.documentos_reemplazados(ruta) values(old.ruta) on conflict do nothing;
  end if;
  return null;
end;
$$;
revoke all on function privado.registrar_archivo_reemplazado() from public,anon,authenticated;
create trigger registrar_archivo_reemplazado after update of ruta on public.documentos_conductor
for each row execute function privado.registrar_archivo_reemplazado();

-- Para archivos históricos no se puede inferir la fecha de reemplazo. Su
-- plazo empieza al detectarlos; se excluyen las cargas en curso o recientes.
do $$
begin
  if to_regclass('storage.objects') is not null then
    insert into privado.documentos_reemplazados(ruta)
    select o.name from storage.objects o
    where o.bucket_id='documentos' and o.created_at<now()-interval '1 day'
      and o.name ~ '^[0-9a-f-]{36}/(cedula|licencia|tarjeta_propiedad)-[0-9]+\.(jpg|png|webp|pdf)$'
      and not exists (select 1 from public.documentos_conductor where ruta=o.name)
    on conflict do nothing;
  end if;
end;
$$;

create function privado.documentos_para_limpiar()
returns table(ruta text) language sql set search_path = '' as $$
  select a.ruta from privado.documentos_reemplazados a
  where a.eliminar_desde<=now() and not exists (
    select 1 from public.documentos_conductor d where d.ruta=a.ruta
  ) order by a.eliminar_desde,a.ruta limit 50 for update of a skip locked;
$$;
revoke all on function privado.documentos_para_limpiar() from public,anon,authenticated;

create or replace function privado.conductor_verificado(p_conductor uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select count(*)=3 from public.documentos_conductor
  where conductor_id=p_conductor and estado='aprobado'
    and (vence_el is null or vence_el >= (now() at time zone 'America/Bogota')::date);
$$;

create function privado.vencer_licencias()
returns void language plpgsql security definer set search_path = '' as $$
declare v_persona uuid;
begin
  for v_persona in
    select d.conductor_id from public.documentos_conductor d
    where d.tipo='licencia' and d.estado='aprobado' and d.vence_el<(now() at time zone 'America/Bogota')::date
      and (exists (select 1 from public.perfiles p where p.id=d.conductor_id and p.disponible)
        or exists (select 1 from public.ofertas o where o.conductor_id=d.conductor_id and o.estado='activa'))
  loop
    perform privado.al_perder_verificacion(v_persona);
  end loop;
end;
$$;
revoke all on function privado.vencer_licencias() from public,anon,authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname='pg_cron') then
    perform cron.schedule('unigo-vencer-licencias','10 5 * * *','select privado.vencer_licencias()');
    perform cron.schedule('unigo-limpiar-documentos','20 * * * *',
      $tarea$select privado.pedir_tarea_unigo('limpiar-documentos','{}'::jsonb)$tarea$);
  end if;
end;
$$;

create function public.revisar_documento_con_vigencia(p_documento uuid,p_aprobar boolean,p_motivo text default null,p_vence_el date default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc public.documentos_conductor;
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
begin
  if not privado.soy_admin() then
    raise exception 'Solo un administrador puede revisar documentos.';
  end if;
  select * into v_doc from public.documentos_conductor where id=p_documento;
  perform 1 from public.perfiles where id=v_doc.conductor_id for update;
  select * into v_doc from public.documentos_conductor where id=p_documento for update;
  if v_doc.id is null then
    raise exception 'Ese documento no existe.';
  end if;
  if v_doc.conductor_id = auth.uid() then
    raise exception 'No puedes revisar tus propios documentos.';
  end if;
  if v_doc.estado <> 'pendiente' then
    raise exception 'Ese documento ya fue revisado.';
  end if;
  if p_aprobar is not true and v_motivo is null then
    raise exception 'Escribe el motivo del rechazo.';
  end if;

  if p_aprobar and v_doc.tipo='licencia' and
    (p_vence_el is null or p_vence_el < (now() at time zone 'America/Bogota')::date) then
    raise exception 'Registra una fecha de vencimiento vigente para aprobar la licencia.';
  end if;

  update public.documentos_conductor
  set vence_el=case when p_aprobar and v_doc.tipo='licencia' then p_vence_el else null end,
      estado = case when p_aprobar then 'aprobado'::public.estado_documento else 'rechazado'::public.estado_documento end,
      motivo = case when p_aprobar then null else left(v_motivo, 300) end,
      revisado_en = now(),
      revisado_por = auth.uid()
  where id = p_documento;

  perform privado.al_perder_verificacion(v_doc.conductor_id);
end;
$$;
revoke all on function public.revisar_documento_con_vigencia(uuid,boolean,text,date) from public,anon,authenticated;
grant execute on function public.revisar_documento_con_vigencia(uuid,boolean,text,date) to authenticated;

create or replace function public.revisar_documento(p_documento uuid,p_aprobar boolean,p_motivo text default null)
returns void language sql security invoker set search_path = '' as $$
  select public.revisar_documento_con_vigencia(p_documento,p_aprobar,p_motivo,null);
$$;

-- Una oferta pendiente no se puede aceptar después del vencimiento, incluso
-- si el trabajo programado todavía no ha retirado la oferta.
create function privado.licencia_vigente_al_asignar()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.estado='aceptado' and old.estado='solicitado' and exists (
    select 1 from public.documentos_conductor d where d.conductor_id=new.conductor_id
      and d.tipo='licencia' and d.vence_el<(now() at time zone 'America/Bogota')::date
  ) then raise exception 'La licencia del conductor venció. Elige otra oferta.'; end if;
  return new;
end;
$$;
revoke all on function privado.licencia_vigente_al_asignar() from public,anon,authenticated;
create trigger licencia_vigente_al_asignar before update of estado on public.viajes
for each row execute function privado.licencia_vigente_al_asignar();
