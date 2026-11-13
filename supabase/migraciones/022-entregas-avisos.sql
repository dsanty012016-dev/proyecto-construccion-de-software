-- 022 · Reserva y confirmación por celular. Tomar un aviso ya no equivale a
-- haberlo enviado. La función nueva se despliega DESPUÉS de esta migración;
-- tomar_aviso se conserva para que la versión anterior siga funcionando.

create table privado.entregas_push (
  aviso_id bigint not null references privado.avisos(id) on delete cascade,
  suscripcion_id uuid not null references privado.suscripciones_push(id) on delete cascade,
  token_toma uuid,
  tomado_en timestamptz,
  enviado_en timestamptz,
  intentos integer not null default 0,
  primary key (aviso_id, suscripcion_id)
);
alter table privado.entregas_push enable row level security;
revoke all on privado.entregas_push from public, anon, authenticated;

create function privado.reservar_entregas(p_aviso bigint, p_ahora timestamptz default now())
returns table (titulo text, cuerpo text, url text, endpoint text, p256dh text, auth text, suscripcion_id uuid, token_toma uuid)
language plpgsql security definer set search_path = ''
as $$
declare v_aviso privado.avisos; v_token uuid := gen_random_uuid();
begin
  select * into v_aviso from privado.avisos where id = p_aviso for update;
  if v_aviso.id is null or v_aviso.enviado_en is not null
     or v_aviso.creado_en <= p_ahora - interval '1 hour' then return; end if;

  insert into privado.entregas_push (aviso_id, suscripcion_id)
  select p_aviso, s.id from privado.suscripciones_push s
  where s.persona_id = any(v_aviso.personas)
  on conflict do nothing;

  update privado.entregas_push e
  set token_toma = v_token, tomado_en = p_ahora, intentos = e.intentos + 1
  from privado.suscripciones_push s
  where e.aviso_id = p_aviso and e.suscripcion_id = s.id
    and s.persona_id = any(v_aviso.personas) and e.enviado_en is null
    and (e.tomado_en is null or e.tomado_en <= p_ahora - interval '2 minutes');

  -- Una cuenta que cerró sesión o un celular borrado ya no son destinatarios.
  if not exists (
    select 1 from privado.entregas_push e join privado.suscripciones_push s on s.id = e.suscripcion_id
    where e.aviso_id = p_aviso and e.enviado_en is null and s.persona_id = any(v_aviso.personas)
  ) then
    update privado.avisos set enviado_en = p_ahora where id = p_aviso;
  end if;

  return query
  select v_aviso.titulo, v_aviso.cuerpo, v_aviso.url, s.endpoint, s.p256dh, s.auth, s.id, e.token_toma
  from privado.entregas_push e join privado.suscripciones_push s on s.id = e.suscripcion_id
  where e.aviso_id = p_aviso and e.token_toma = v_token and e.enviado_en is null
    and s.persona_id = any(v_aviso.personas);
end;
$$;

create function privado.confirmar_entrega(p_aviso bigint, p_suscripcion uuid, p_token uuid, p_exito boolean)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_personas uuid[];
begin
  -- Mismo orden que reservar_entregas: aviso y luego entregas.
  select personas into v_personas from privado.avisos where id = p_aviso for update;
  if not found then return; end if;
  update privado.entregas_push
  set enviado_en = case when p_exito then now() else null end,
      token_toma = null, tomado_en = null
  where aviso_id = p_aviso and suscripcion_id = p_suscripcion and token_toma = p_token and enviado_en is null;
  if not found then return; end if;
  if not exists (
    select 1 from privado.entregas_push e join privado.suscripciones_push s on s.id = e.suscripcion_id
    where e.aviso_id = p_aviso and e.enviado_en is null and s.persona_id = any(v_personas)
  ) then
    update privado.avisos set enviado_en = now() where id = p_aviso;
  end if;
end;
$$;

revoke all on function privado.reservar_entregas(bigint, timestamptz) from public, anon, authenticated;
revoke all on function privado.confirmar_entrega(bigint, uuid, uuid, boolean) from public, anon, authenticated;
