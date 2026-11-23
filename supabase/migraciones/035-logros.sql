-- 035: logros que celebra Uni.
-- Uni celebra hitos: primer viaje, 10 viajes (cada rol con los suyos) y las
-- primeras 5 estrellas recibidas. Qué logro se alcanza lo decide la app
-- (app/lib/mascota.ts, con pruebas); aquí solo se cuentan los datos de quien
-- llama y se guarda qué celebraciones ya vio, para no repetirlas aunque cambie
-- de celular. Un viaje cuenta si es un viaje inmediato terminado o un cupo
-- terminado (como estudiante, con su puesto aprobado; como conductor, con al
-- menos un puesto aprobado).
-- La tabla no tiene políticas: nadie la lee ni la escribe directo, solo las
-- funciones de abajo, que únicamente tocan las filas de quien llama.

create table public.logros_celebrados (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  logro text not null check (logro in (
    'primer_viaje_estudiante', 'diez_viajes_estudiante',
    'primer_viaje_conductor', 'diez_viajes_conductor',
    'primeras_cinco_estrellas'
  )),
  celebrado_en timestamptz not null default now(),
  primary key (usuario_id, logro)
);
alter table public.logros_celebrados enable row level security;
revoke all on public.logros_celebrados from anon, authenticated;

create function public.mis_logros()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  yo uuid := auth.uid();
begin
  if yo is null then
    return null;
  end if;
  return jsonb_build_object(
    'viajes_estudiante',
      (select count(*) from public.viajes v where v.estudiante_id = yo and v.estado = 'terminado')
      + (select count(*) from public.puestos p join public.cupos c on c.id = p.cupo_id
         where p.estudiante_id = yo and p.estado = 'aprobado' and c.estado = 'terminado'),
    'viajes_conductor',
      (select count(*) from public.viajes v where v.conductor_id = yo and v.estado = 'terminado')
      + (select count(*) from public.cupos c where c.conductor_id = yo and c.estado = 'terminado'
         and exists (select 1 from public.puestos p where p.cupo_id = c.id and p.estado = 'aprobado')),
    'cinco_estrellas',
      (select count(*) from public.calificaciones k where k.calificado_id = yo and k.estrellas = 5),
    'celebrados',
      coalesce((select jsonb_agg(l.logro order by l.celebrado_en) from public.logros_celebrados l where l.usuario_id = yo), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.mis_logros() from public, anon, authenticated;
grant execute on function public.mis_logros() to authenticated;

-- Marca una celebración como vista. Repetirla no hace nada; un nombre que no
-- es un logro lo rechaza la tabla.
create function public.celebrar_logro(p_logro text)
returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null or p_logro is null then
    return;
  end if;
  insert into public.logros_celebrados (usuario_id, logro)
  values (auth.uid(), p_logro)
  on conflict (usuario_id, logro) do nothing;
end;
$$;
revoke all on function public.celebrar_logro(text) from public, anon, authenticated;
grant execute on function public.celebrar_logro(text) to authenticated;
