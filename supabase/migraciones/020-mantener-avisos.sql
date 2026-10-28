-- 020 · Mantenimiento de las notificaciones (019)
-- - Reintento: si la función "enviar-avisos" no respondió en el momento (por
--   ejemplo, Supabase tardó en arrancarla), el aviso queda sin tomar. Cada 2
--   minutos se le vuelve a pedir que envíe los de los últimos 30 minutos que
--   tengan más de 1 minuto. Es seguro repetir: cada aviso se toma una sola vez
--   (privado.tomar_aviso).
-- - Limpieza: se borran los avisos de más de 7 días, enviados o no. Así la
--   cola no crece sin fin. Las respuestas guardadas de pg_net las limpia la
--   misma extensión.
-- - Lo hace privado.mantener_avisos(), con la hora por parámetro para probarla.

-- Le pide a la función de Supabase que envíe un aviso (sin pg_net no hace nada).
create function privado.pedir_envio(p_aviso bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from pg_namespace where nspname = 'net') then
    perform net.http_post(
      url := 'https://jcdczmzaigeobybzscab.supabase.co/functions/v1/enviar-avisos',
      body := jsonb_build_object('aviso', p_aviso),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  end if;
end;
$$;

-- Devuelve cuántos avisos volvió a pedir y cuántos borró.
create function privado.mantener_avisos(p_ahora timestamptz default now())
returns table (reintentados integer, borrados integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_aviso bigint;
  v_reintentados integer := 0;
  v_borrados integer;
begin
  for v_aviso in
    select id from privado.avisos
    where enviado_en is null
      and creado_en > p_ahora - interval '30 minutes'
      and creado_en <= p_ahora - interval '1 minute'
    order by id
    limit 100
  loop
    perform privado.pedir_envio(v_aviso);
    v_reintentados := v_reintentados + 1;
  end loop;

  delete from privado.avisos where creado_en < p_ahora - interval '7 days';
  get diagnostics v_borrados = row_count;

  return query select v_reintentados, v_borrados;
end;
$$;

revoke all on function privado.pedir_envio(bigint) from public, anon, authenticated;
revoke all on function privado.mantener_avisos(timestamptz) from public, anon, authenticated;

-- Cada 2 minutos con pg_cron (Supabase lo trae; en la base de pruebas no).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('unigo-mantener-avisos', '*/2 * * * *', 'select * from privado.mantener_avisos()');
  end if;
end;
$$;
