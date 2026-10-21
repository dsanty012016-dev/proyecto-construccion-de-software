-- 008 · Tiempo real para viajes y ofertas
-- Agrega las tablas a la publicación de Supabase Realtime para que la app vea
-- ofertas nuevas y cambios de estado sin recargar. Realtime respeta RLS: cada
-- quien recibe solo las filas que sus políticas le dejan ver (004-viajes.sql).

alter publication supabase_realtime add table public.viajes, public.ofertas;
