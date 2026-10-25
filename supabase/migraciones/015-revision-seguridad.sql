-- 015 · Revisión de seguridad (fase 7). Detalle en docs/seguridad.md.
--
-- 1. Cambio de vehículo sin revisión: si el conductor cambiaba la placa, la
--    tarjeta de propiedad volvía a revisión (011), pero si BORRABA el vehículo
--    y registraba otro, seguía verificado con el carro anterior. Ahora borrar
--    el vehículo también manda la tarjeta a revisión.
-- 2. Permisos que sobraban: Supabase da a anon y authenticated los permisos
--    TRIGGER, REFERENCES y TRUNCATE sobre las tablas nuevas. Desde la API no
--    se pueden usar, pero se quitan por si acaso (defensa en profundidad).
-- 3. Sin sesión no hace falta ni el permiso de leer perfiles (RLS ya no
--    devolvía filas; ahora ni se intenta).

create or replace function privado.al_borrar_vehiculo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.perfiles set disponible = false where id = old.conductor_id;
  update public.ofertas set estado = 'retirada'
  where conductor_id = old.conductor_id and estado = 'activa';
  -- El vehículo nuevo necesita su propia tarjeta de propiedad revisada.
  update public.documentos_conductor
  set estado = 'pendiente', motivo = 'Cambiaste de vehículo.', revisado_en = null, revisado_por = null
  where conductor_id = old.conductor_id and tipo = 'tarjeta_propiedad' and estado <> 'pendiente';
  return old;
end;
$$;

revoke all on function privado.al_borrar_vehiculo() from public, anon, authenticated;

do $$
declare
  v_tabla record;
begin
  for v_tabla in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format('revoke trigger, references, truncate on public.%I from anon, authenticated', v_tabla.relname);
  end loop;
end;
$$;

revoke select on public.perfiles from anon;
