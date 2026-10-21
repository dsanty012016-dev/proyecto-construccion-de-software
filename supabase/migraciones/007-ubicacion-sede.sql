-- 007 · Ubicación de la sede de la Universidad Santo Tomás, seccional Villavicencio
-- Es el destino de los viajes (el estudiante pide ir a la universidad). Las
-- coordenadas las dio el equipo desde Google Maps.

update public.universidades
set lat = 4.121686325903587, lng = -73.61549558142269
where dominio_correo = 'ustavillavo.edu.co';
