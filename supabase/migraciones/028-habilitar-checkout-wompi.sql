alter table privado.ajustes_pago
  add column checkout_pausado boolean not null default false,
  add column checkout_real_habilitado boolean not null default false;

alter table public.recargas add column ambiente text check (ambiente in ('test','prod'));

create function privado.puede_abrir_checkout(p_ambiente text, p_ajustes privado.ajustes_pago)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(not p_ajustes.checkout_pausado and case p_ambiente
    when 'test' then starts_with(p_ajustes.secreto_eventos,'test_events_')
    when 'prod' then starts_with(p_ajustes.secreto_eventos,'prod_events_')
      and not p_ajustes.recarga_simulada and p_ajustes.saldos_de_prueba_revisados
      and p_ajustes.checkout_real_habilitado
    else false
  end,false);
$$;
revoke all on function privado.puede_abrir_checkout(text,privado.ajustes_pago) from public,anon,authenticated;

create function public.checkout_wompi_disponible(p_ambiente text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and coalesce((
    select privado.puede_abrir_checkout(p_ambiente,a) from privado.ajustes_pago a
  ),false);
$$;
revoke all on function public.checkout_wompi_disponible(text) from public,anon,authenticated;
grant execute on function public.checkout_wompi_disponible(text) to authenticated;

-- La versión anterior solo abre referencias heredadas. No habilita pagos reales.
create function public.iniciar_recarga_wompi(p_monto integer,p_ambiente text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_ajustes privado.ajustes_pago; v_id uuid;
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero.'; end if;
  select * into v_ajustes from privado.ajustes_pago for share;
  if not privado.puede_abrir_checkout(p_ambiente,v_ajustes) then
    raise exception 'Las recargas de este ambiente no están disponibles en este momento.';
  end if;
  -- Serializa aperturas del mismo usuario para que el límite de pendientes
  -- se aplique también a solicitudes simultáneas.
  perform 1 from public.perfiles where id=auth.uid() for update;
  v_id := public.iniciar_recarga(p_monto);
  update public.recargas set ambiente=p_ambiente where id=v_id;
  return v_id;
end;
$$;
revoke all on function public.iniciar_recarga_wompi(integer,text) from public,anon,authenticated;
grant execute on function public.iniciar_recarga_wompi(integer,text) to authenticated;
