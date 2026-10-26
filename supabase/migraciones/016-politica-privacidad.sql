-- 016 · Aceptación de la política de privacidad (Ley 1581 de 2012)
-- - Cada perfil guarda qué versión de la política aceptó y cuándo (prueba de
--   la autorización que exige la ley).
-- - Al registrarse, la app manda la versión aceptada en los datos de la
--   cuenta y el trigger la guarda. Quien ya tenía cuenta (o una versión vieja)
--   la acepta con aceptar_politica(); la app no deja seguir sin aceptarla.
-- - Nadie lo escribe a mano: perfiles solo deja actualizar nombre y teléfono.

alter table public.perfiles
  add column politica_version text check (politica_version is null or politica_version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  add column politica_aceptada_en timestamptz;

-- Mismo trigger de 002, más la versión de la política aceptada al registrarse.
create or replace function privado.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_universidad smallint := privado.universidad_por_correo(new.email);
  v_datos jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_nombre text;
  v_telefono text;
  v_rol public.rol_usuario;
  v_politica text := v_datos ->> 'politica';
begin
  if v_universidad is null then
    raise exception 'Usa tu correo institucional (@ustavillavo.edu.co).'
      using errcode = 'check_violation';
  end if;

  v_nombre := left(coalesce(
    nullif(btrim(v_datos ->> 'nombre'), ''),
    nullif(btrim(v_datos ->> 'full_name'), ''),
    nullif(btrim(v_datos ->> 'name'), ''),
    split_part(new.email, '@', 1)
  ), 80);
  if char_length(v_nombre) < 2 then
    v_nombre := 'Estudiante';
  end if;

  v_telefono := nullif(regexp_replace(coalesce(v_datos ->> 'telefono', ''), '[\s-]', '', 'g'), '');
  if v_telefono is not null and v_telefono !~ '^\+57[0-9]{10}$' then
    raise exception 'El teléfono debe tener el formato +57 y 10 dígitos.'
      using errcode = 'check_violation';
  end if;

  v_rol := case v_datos ->> 'rol'
    when 'estudiante' then 'estudiante'::public.rol_usuario
    when 'conductor' then 'conductor'::public.rol_usuario
    else null
  end;

  if v_politica is not null and v_politica !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    v_politica := null;
  end if;

  insert into public.perfiles (id, universidad_id, nombre, telefono, rol, politica_version, politica_aceptada_en)
  values (new.id, v_universidad, v_nombre, v_telefono, v_rol, v_politica, case when v_politica is null then null else now() end);
  return new;
end;
$$;

-- Aceptar (o volver a aceptar, si cambió) la política desde la app.
create function public.aceptar_politica(p_version text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión primero.';
  end if;
  if p_version is null or p_version !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'Esa versión de la política no existe.';
  end if;
  update public.perfiles set politica_version = p_version, politica_aceptada_en = now() where id = auth.uid();
end;
$$;

revoke all on function public.aceptar_politica(text) from public, anon;
grant execute on function public.aceptar_politica(text) to authenticated;
