-- Página combinada de viajes y cupos. RLS sigue aplicando y la identidad viene de la sesión.
create function public.historial_viajes_pagina(p_tipo text, p_estado text, p_pendientes boolean, p_pagina integer)
returns table(tipo text, id uuid, fecha timestamptz)
language sql stable security invoker set search_path = '' as $$
  with persona as (select auth.uid() as id),
  elementos as (
    select 'viaje'::text as tipo, v.id, coalesce(v.terminado_en, v.cancelado_en, v.creado_en) as fecha
    from public.viajes v cross join persona yo
    where p_tipo in ('todos', 'pedido')
      and (v.estudiante_id = yo.id or v.conductor_id = yo.id)
      and v.estado in ('terminado', 'cancelado')
      and (p_estado = 'todos' or v.estado::text = p_estado)
      and (not p_pendientes or (v.estado = 'terminado' and not exists (
        select 1 from public.calificaciones k where k.viaje_id = v.id and k.autor_id = yo.id
      )))
    union all
    select 'cupo'::text, c.id, c.sale_en
    from public.cupos c cross join persona yo
    where p_tipo in ('todos', 'cupo')
      and c.estado in ('terminado', 'cancelado')
      and (p_estado = 'todos' or c.estado::text = p_estado)
      and (c.conductor_id = yo.id or exists (
        select 1 from public.puestos p where p.cupo_id = c.id and p.estudiante_id = yo.id
          and ((c.estado = 'terminado' and p.estado = 'aprobado' and p.pagado > 0)
            or (c.estado = 'cancelado' and p.estado = 'cancelado'))
      ))
      and (not p_pendientes or (c.estado = 'terminado' and exists (
        select 1 from public.puestos p where p.cupo_id = c.id and p.estado = 'aprobado'
          and p.pagado > 0 and (c.conductor_id = yo.id or p.estudiante_id = yo.id)
          and not exists (select 1 from public.calificaciones k where k.puesto_id = p.id and k.autor_id = yo.id)
      )))
  )
  select e.tipo, e.id, e.fecha from elementos e
  order by e.fecha desc, e.tipo, e.id
  limit 16 offset ((greatest(1, least(coalesce(p_pagina, 1), 999999)) - 1) * 15);
$$;
revoke all on function public.historial_viajes_pagina(text, text, boolean, integer) from public, anon;
grant execute on function public.historial_viajes_pagina(text, text, boolean, integer) to authenticated;

-- El cierre deja constancia de la comparación manual. La recarga y el saldo
-- siguen su flujo financiero existente.
alter table privado.incidencias_pago
  add column resuelta_en timestamptz,
  add column revisada_por uuid references public.perfiles(id),
  add column nota_revision text,
  add constraint cierre_incidencia_completo check (
    (resuelta_en is null and revisada_por is null and nota_revision is null)
    or (resuelta_en is not null and revisada_por is not null and nota_revision is not null
      and char_length(btrim(nota_revision)) between 3 and 500)
  );

create index incidencias_por_revision on privado.incidencias_pago
  ((resuelta_en is not null), (coalesce(resuelta_en, detectado_en)) desc, id);

create function public.historial_incidencias_pago(p_resueltas boolean, p_pagina integer)
returns table (
  id uuid, recarga_id uuid, transaccion text, motivo text, detectado_en timestamptz,
  resuelta_en timestamptz, revisada_por uuid, responsable text, nota_revision text,
  monto integer, estado_recarga text, transaccion_recarga text, creditos_coincidentes bigint, total bigint
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or privado.soy_admin() is distinct from true then
    raise exception 'Solo los administradores revisan pagos.';
  end if;
  return query
    select i.id, i.recarga_id, i.transaccion, i.motivo, i.detectado_en,
      i.resuelta_en, i.revisada_por, p.nombre, i.nota_revision,
      r.monto, r.estado::text, r.transaccion,
      case when r.id is not null then (
        select count(*) from public.movimientos m
        where m.persona_id = r.persona_id and m.tipo = 'recarga'
          and m.monto = r.monto and m.creado_en = r.resuelta_en
      ) end, count(*) over()
    from privado.incidencias_pago i
    left join public.perfiles p on p.id = i.revisada_por
    left join public.recargas r on r.id = i.recarga_id
    where (i.resuelta_en is not null) = p_resueltas
    order by coalesce(i.resuelta_en, i.detectado_en) desc, i.id
  limit 20 offset ((greatest(1, least(coalesce(p_pagina, 1), 999999)) - 1) * 20);
end;
$$;

create function public.cerrar_incidencia_pago(p_incidencia uuid, p_verificada boolean, p_nota text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_persona uuid := auth.uid();
begin
  if v_persona is null or privado.soy_admin() is distinct from true then
    raise exception 'Solo los administradores revisan pagos.';
  end if;
  if p_verificada is distinct from true then
    raise exception 'Confirma la comparación de la operación antes de cerrar.';
  end if;
  if p_nota is null or char_length(btrim(p_nota)) not between 3 and 500 then
    raise exception 'Escribe el resultado de la revisión en 3 a 500 caracteres.';
  end if;
  update privado.incidencias_pago
  set resuelta_en = now(), revisada_por = v_persona, nota_revision = btrim(p_nota)
  where id = p_incidencia and resuelta_en is null;
  if not found then raise exception 'La incidencia ya fue cerrada o no está disponible.'; end if;
end;
$$;
revoke all on function public.historial_incidencias_pago(boolean, integer) from public, anon;
revoke all on function public.cerrar_incidencia_pago(uuid, boolean, text) from public, anon;
grant execute on function public.historial_incidencias_pago(boolean, integer) to authenticated;
grant execute on function public.cerrar_incidencia_pago(uuid, boolean, text) to authenticated;
