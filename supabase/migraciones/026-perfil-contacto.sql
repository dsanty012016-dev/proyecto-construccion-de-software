-- Contacto editable por su dueño. Usa los permisos de columnas y RLS ya
-- existentes; no recibe un ID ni modifica correo, rol o administración.
create function public.actualizar_contacto(p_nombre text, p_telefono text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
begin
  if v_usuario is null then
    raise exception 'Inicia sesión para actualizar tus datos.';
  end if;
  if p_nombre is null or char_length(btrim(p_nombre)) not between 2 and 80 then
    raise exception 'El nombre debe tener entre 2 y 80 caracteres.';
  end if;
  if p_telefono is null or p_telefono !~ '^\+573[0-9]{9}$' then
    raise exception 'Escribe un celular colombiano válido.';
  end if;
  update public.perfiles
    set nombre = btrim(p_nombre), telefono = p_telefono
    where id = v_usuario;
  if not found then
    raise exception 'No pudimos encontrar tu perfil. Vuelve a iniciar sesión.';
  end if;
end;
$$;
revoke all on function public.actualizar_contacto(text, text) from public, anon;
grant execute on function public.actualizar_contacto(text, text) to authenticated;
