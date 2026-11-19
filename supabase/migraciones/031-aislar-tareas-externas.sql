-- Cada instalación configura sus propios valores en Vault. Una base local o
-- una instalación sin configuración no realiza peticiones externas.
create function privado.pedir_tarea_unigo(p_tarea text,p_datos jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_origen text; v_token text;
begin
  if p_tarea not in ('enviar-avisos','limpiar-documentos') or p_tarea is null
    or to_regclass('vault.decrypted_secrets') is null
    or not exists (select 1 from pg_extension where extname='pg_net') then return;
  end if;
  execute $consulta$
    select max(decrypted_secret) filter (where name='unigo_tareas_origen'),
           max(decrypted_secret) filter (where name='unigo_tareas_token')
    from vault.decrypted_secrets where name in ('unigo_tareas_origen','unigo_tareas_token')
  $consulta$ into v_origen,v_token;
  if v_origen is null or v_origen !~ '^https://[a-z0-9-]+\.supabase\.co$'
    or v_token is null or v_token !~ '^[A-Za-z0-9_-]{32,128}$' then return;
  end if;
  perform net.http_post(url:=v_origen||'/functions/v1/'||p_tarea,body:=p_datos,
    headers:=jsonb_build_object('Content-Type','application/json','X-UniGo-Tareas',v_token),
    timeout_milliseconds:=10000);
end;
$$;
revoke all on function privado.pedir_tarea_unigo(text,jsonb) from public,anon,authenticated;

create function privado.hash_token_tareas()
returns text language plpgsql stable security definer set search_path = '' as $$
declare v_hash text;
begin
  if to_regclass('vault.decrypted_secrets') is null then return null; end if;
  execute $consulta$
    select encode(sha256(convert_to(decrypted_secret,'UTF8')),'hex')
    from vault.decrypted_secrets where name='unigo_tareas_token'
      and decrypted_secret ~ '^[A-Za-z0-9_-]{32,128}$'
  $consulta$ into v_hash;
  return v_hash;
end;
$$;
revoke all on function privado.hash_token_tareas() from public,anon,authenticated;

create or replace function privado.pedir_envio(p_aviso bigint)
returns void language sql security definer set search_path = '' as $$
  select privado.pedir_tarea_unigo('enviar-avisos',jsonb_build_object('aviso',p_aviso));
$$;

create or replace function privado.avisar(p_personas uuid[],p_titulo text,p_cuerpo text,p_url text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_personas uuid[]; v_id bigint;
begin
  select array_agg(distinct s.persona_id) into v_personas from privado.suscripciones_push s
  where s.persona_id=any(p_personas);
  if v_personas is null then return; end if;
  insert into privado.avisos(personas,titulo,cuerpo,url)
  values(v_personas,left(p_titulo,80),left(p_cuerpo,200),p_url) returning id into v_id;
  perform privado.pedir_envio(v_id);
end;
$$;

do $$
begin
  if to_regclass('net.http_request_queue') is not null then
    revoke select on net.http_request_queue from public,anon,authenticated;
  end if;
end;
$$;
