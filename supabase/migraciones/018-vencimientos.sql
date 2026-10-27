-- 018 · Solicitudes y cupos que vencen solos
-- - Viaje por pedido: si a los 15 minutos de pedirlo sigue sin aceptar una
--   oferta, la solicitud se cancela sola. No hay dinero en juego (se paga al
--   aceptar) ni strike. Las ofertas que hubiera quedan rechazadas.
-- - Cupo (hora fija): si 5 minutos después de la hora de salida el conductor
--   no ha salido, el cupo se cancela solo. Igual que cuando el conductor lo
--   cancela: a quien pagó se le devuelve todo y, si había puestos pagados, el
--   conductor suma 1 strike (no salió).
-- - Las cancela privado.vencer_pendientes(), que corre cada minuto con
--   pg_cron. La hora entra por parámetro para poder probarla.
-- - "vencio" marca que se cerró solo (para decirlo así en la pantalla).

alter table public.viajes add column vencio boolean not null default false;
alter table public.cupos add column vencio boolean not null default false;

create function privado.vencer_pendientes(p_ahora timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_viaje public.viajes;
  v_cupo public.cupos;
  v_puesto public.puestos;
  v_habia_pagos boolean;
  v_total integer := 0;
begin
  -- Solicitudes de viaje sin aceptar después de 15 minutos.
  for v_viaje in
    select * from public.viajes
    where estado = 'solicitado' and creado_en <= p_ahora - interval '15 minutes'
    for update skip locked
  loop
    update public.viajes
    set estado = 'cancelado', cancelado_en = p_ahora, cancelado_por = v_viaje.estudiante_id, vencio = true
    where id = v_viaje.id;
    update public.ofertas set estado = 'rechazada' where viaje_id = v_viaje.id and estado = 'activa';
    v_total := v_total + 1;
  end loop;

  -- Cupos que no salieron 5 minutos después de la hora de salida.
  for v_cupo in
    select * from public.cupos
    where estado = 'publicado' and sale_en <= p_ahora - interval '5 minutes'
    for update skip locked
  loop
    v_habia_pagos := false;
    for v_puesto in
      select * from public.puestos where cupo_id = v_cupo.id and estado = 'aprobado' and pagado > 0 for update
    loop
      v_habia_pagos := true;
      perform privado.mover_saldo(v_puesto.estudiante_id, v_puesto.pagado, 'reembolso_puesto',
                                  'Devolución: el cupo no salió', null, v_puesto.id);
    end loop;
    if v_habia_pagos then
      perform privado.dar_strike(v_cupo.conductor_id, 'No salió en un cupo con puestos pagados', null, v_cupo.id);
    end if;
    update public.cupos set estado = 'cancelado', cancelado_en = p_ahora, vencio = true where id = v_cupo.id;
    update public.puestos set estado = 'cancelado', decidido_en = p_ahora, pagado = 0
    where cupo_id = v_cupo.id and estado in ('pendiente', 'aprobado');
    v_total := v_total + 1;
  end loop;

  return v_total;
end;
$$;

revoke all on function privado.vencer_pendientes(timestamptz) from public, anon, authenticated;

-- Cada minuto, con pg_cron (Supabase lo trae). En la base de pruebas de
-- GitHub no existe: ahí la función se prueba llamándola directamente.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and current_setting('shared_preload_libraries', true) like '%pg_cron%' then
    create extension if not exists pg_cron;
    perform cron.schedule('unigo-vencer-pendientes', '* * * * *', 'select privado.vencer_pendientes()');
  end if;
end;
$$;
