-- 002 · Perfiles
-- Un perfil por cuenta de Supabase Auth. Se crea solo, con un trigger, cuando
-- alguien se registra (correo y contraseña o Google). El trigger rechaza
-- cualquier correo cuyo dominio no sea de una universidad registrada: así el
-- filtro vive en la base de datos y no se puede saltar desde la pantalla.

create type public.rol_usuario as enum ('estudiante', 'conductor');

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  universidad_id smallint not null references public.universidades (id),
  nombre text not null check (char_length(btrim(nombre)) between 2 and 80),
  -- Celular colombiano: +57 y 10 dígitos.
  telefono text check (telefono ~ '^\+57[0-9]{10}$'),
  -- Null mientras la persona no lo haya elegido (pasa al entrar con Google).
  rol public.rol_usuario,
  -- "Estás disponible" del conductor: solo así ve solicitudes y puede ofertar.
  disponible boolean not null default false,
  creado_en timestamptz not null default now(),
  constraint disponible_solo_si_conductor check (not disponible or rol = 'conductor')
);

alter table public.perfiles enable row level security;

-- ---------------------------------------------------------------------------
-- Funciones de ayuda (security definer para no chocar con las políticas)
-- ---------------------------------------------------------------------------

create function privado.mi_perfil()
returns public.perfiles
language sql
stable
security definer
set search_path = ''
as $$
  select p.* from public.perfiles p where p.id = auth.uid();
$$;

create function privado.universidad_por_correo(p_correo text)
returns smallint
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
  from public.universidades u
  where u.activa
    and u.dominio_correo = lower(split_part(p_correo, '@', 2))
    and p_correo like '_%@_%'
    and split_part(p_correo, '@', 3) = ''; -- una sola "@"
$$;

-- ---------------------------------------------------------------------------
-- Trigger: crear el perfil al registrarse
-- ---------------------------------------------------------------------------
-- Datos que manda el registro (options.data en supabase.auth.signUp):
--   nombre, telefono, rol ('estudiante' | 'conductor').
-- Google manda full_name / name; el rol queda pendiente.

create function privado.crear_perfil()
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

  insert into public.perfiles (id, universidad_id, nombre, telefono, rol)
  values (new.id, v_universidad, v_nombre, v_telefono, v_rol);
  return new;
end;
$$;

create trigger crear_perfil_al_registrarse
  after insert on auth.users
  for each row execute function privado.crear_perfil();

-- Si alguien cambia su correo, el nuevo también debe ser institucional.
create function privado.revisar_cambio_de_correo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if privado.universidad_por_correo(new.email) is null then
    raise exception 'Usa tu correo institucional (@ustavillavo.edu.co).'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger revisar_correo_institucional
  before update of email on auth.users
  for each row
  when (new.email is distinct from old.email)
  execute function privado.revisar_cambio_de_correo();

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------
-- Cada quien ve su perfil. El de la otra persona del viaje (con su teléfono)
-- se ve mientras el viaje está aceptado o en curso: esa política está en
-- 004-viajes.sql, que es donde existe la tabla de viajes. Para mostrar solo el
-- nombre y la calificación de otros está perfiles_publicos() en 005.

create policy "perfiles: cada quien ve el suyo"
  on public.perfiles for select
  to authenticated
  using (id = (select auth.uid()));

-- Se puede editar nombre y teléfono propios; rol y disponibilidad solo con las
-- funciones de abajo. Insertar y borrar lo hacen el trigger y el borrado de la
-- cuenta.
revoke insert, update, delete, truncate on public.perfiles from anon, authenticated;
grant update (nombre, telefono) on public.perfiles to authenticated;

create policy "perfiles: cada quien edita el suyo"
  on public.perfiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Funciones RPC
-- ---------------------------------------------------------------------------

-- El rol se elige una sola vez (al registrarse o tras entrar con Google).
create function public.elegir_rol(p_rol public.rol_usuario)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión primero.';
  end if;
  update public.perfiles set rol = p_rol
  where id = auth.uid() and rol is null;
  if not found then
    raise exception 'Tu rol ya está definido.';
  end if;
end;
$$;

revoke all on function privado.mi_perfil() from public, anon;
revoke all on function privado.universidad_por_correo(text) from public, anon, authenticated;
revoke all on function privado.crear_perfil() from public, anon, authenticated;
revoke all on function privado.revisar_cambio_de_correo() from public, anon, authenticated;
revoke all on function public.elegir_rol(public.rol_usuario) from public, anon;
grant execute on function privado.mi_perfil() to authenticated;
grant execute on function public.elegir_rol(public.rol_usuario) to authenticated;
