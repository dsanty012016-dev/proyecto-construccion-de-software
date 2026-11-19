create index recargas_pendientes_operacion on public.recargas(creada_en)
  where estado='pendiente' and revision_resuelta_en is null;
create index avisos_pendientes_operacion on privado.avisos(creado_en) where enviado_en is null;

create function public.resumen_operativo()
returns table(recargas_pendientes bigint,retiros_por_vencer bigint,retiros_vencidos bigint,
  avisos_atrasados bigint,archivos_por_limpiar bigint,licencias_sin_vigencia bigint,
  checkout_pruebas boolean,checkout_real boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or privado.soy_admin() is distinct from true then
    raise exception 'Solo los administradores consultan el estado operativo.';
  end if;
  return query select
    (select count(*) from public.recargas where estado='pendiente' and revision_resuelta_en is null
      and creada_en<now()-interval '30 minutes'),
    (select count(*) from public.retiros where estado='solicitado' and plazo_hasta between now() and now()+interval '24 hours'),
    (select count(*) from public.retiros where estado='solicitado' and plazo_hasta<now()),
    (select count(*) from privado.avisos where enviado_en is null and creado_en<now()-interval '5 minutes'),
    (select count(*) from privado.documentos_reemplazados where eliminar_desde<=now()),
    (select count(*) from public.documentos_conductor where tipo='licencia' and estado='aprobado' and vence_el is null),
    public.checkout_wompi_disponible('test'),public.checkout_wompi_disponible('prod');
end;
$$;
revoke all on function public.resumen_operativo() from public,anon,authenticated;
grant execute on function public.resumen_operativo() to authenticated;
