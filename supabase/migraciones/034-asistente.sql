-- 034: cupo diario del asistente Uni.
-- Cada mensaje al asistente cuenta. Con más de 40 al día por persona, la app
-- responde con el guion propio en vez de llamar a Gemini: protege el plan
-- gratuito de la API (que se comparte entre todos) y evita abusos.
-- La tabla no tiene políticas: nadie la lee ni la escribe directo, solo la
-- función de abajo, que únicamente toca la fila de quien llama.

create table public.asistente_uso (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  dia date not null,
  mensajes integer not null default 0 check (mensajes >= 0),
  primary key (usuario_id, dia)
);
alter table public.asistente_uso enable row level security;
revoke all on public.asistente_uso from anon, authenticated;

create function public.usar_asistente()
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  yo uuid := auth.uid();
  hoy date := (now() at time zone 'America/Bogota')::date;
  usados integer;
begin
  if yo is null then
    return false;
  end if;
  -- Lo de días anteriores ya no sirve.
  delete from public.asistente_uso where usuario_id = yo and dia < hoy;
  insert into public.asistente_uso (usuario_id, dia, mensajes)
  values (yo, hoy, 1)
  on conflict (usuario_id, dia) do update set mensajes = public.asistente_uso.mensajes + 1
  returning mensajes into usados;
  return usados <= 40;
end;
$$;
revoke all on function public.usar_asistente() from public, anon, authenticated;
grant execute on function public.usar_asistente() to authenticated;
