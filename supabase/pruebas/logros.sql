-- Pruebas de 035 (logros de Uni) en la base simulada; nunca contra el proyecto real.
\echo '== Logros de Uni'
reset role;
select gen_random_uuid() as log_est, gen_random_uuid() as log_cond, gen_random_uuid() as log_otro \gset
insert into auth.users(id, email, raw_user_meta_data) values
  (:'log_est', 'logro-uno@ustavillavo.edu.co', '{"nombre":"Logro Uno","rol":"estudiante"}'),
  (:'log_cond', 'logro-dos@ustavillavo.edu.co', '{"nombre":"Logro Dos","rol":"conductor"}'),
  (:'log_otro', 'logro-tres@ustavillavo.edu.co', '{"nombre":"Logro Tres","rol":"estudiante"}');
select universidad_id as log_u from public.perfiles where id = :'log_est' \gset

-- Nueve viajes inmediatos terminados y uno cancelado (no cuenta).
insert into public.viajes (estudiante_id, universidad_id, origen_lat, origen_lng, origen_texto,
  destino_lat, destino_lng, destino_texto, estado, conductor_id, precio, terminado_en)
select :'log_est', :'log_u', 4, -73, 'Barrio ' || n, 4.1, -73.1, 'Universidad', 'terminado', :'log_cond', 6000, now()
from generate_series(1, 9) s(n);
insert into public.viajes (estudiante_id, universidad_id, origen_lat, origen_lng, origen_texto,
  destino_lat, destino_lng, destino_texto, estado, cancelado_en, cancelado_por)
values (:'log_est', :'log_u', 4, -73, 'Cancelado', 4.1, -73.1, 'Universidad', 'cancelado', now(), :'log_est');

-- Un cupo terminado con su puesto aprobado: el décimo viaje del estudiante
-- (para publicar cupos, el conductor necesita sus documentos aprobados).
insert into public.documentos_conductor(conductor_id, tipo, ruta, estado, autorizado_en)
select :'log_cond', t.tipo, :'log_cond' || '/' || t.tipo || '.jpg', 'aprobado', now()
from unnest(enum_range(null::public.tipo_documento)) t(tipo);
insert into public.cupos(conductor_id, universidad_id, salida_lat, salida_lng, salida_texto,
  destino_lat, destino_lng, destino_texto, sale_en, puestos, precio, estado)
values (:'log_cond', :'log_u', 4, -73, 'Barrio cupo', 4.1, -73.1, 'Universidad', now() - interval '2 days', 2, 6000, 'terminado')
returning id as log_cupo \gset
insert into public.puestos(cupo_id, estudiante_id, recogida_lat, recogida_lng, recogida_texto, estado, pagado)
values (:'log_cupo', :'log_est', 4, -73, 'Parque', 'aprobado', 6000);

insert into public.calificaciones (viaje_id, autor_id, calificado_id, estrellas)
select v.id, :'log_est', :'log_cond', 5 from public.viajes v
where v.estudiante_id = :'log_est' and v.estado = 'terminado' limit 1;

set role authenticated;
select prueba.como(:'log_est');
select prueba.ok((select (public.mis_logros() ->> 'viajes_estudiante')::int = 10), 'cuenta viajes inmediatos y cupos terminados, no los cancelados');
select prueba.ok((select (public.mis_logros() ->> 'viajes_conductor')::int = 0), 'el estudiante no tiene viajes como conductor');
select prueba.ok((select (public.mis_logros() ->> 'cinco_estrellas')::int = 0), 'las 5 estrellas que dio no son suyas');
select public.celebrar_logro('primer_viaje_estudiante');
select public.celebrar_logro('primer_viaje_estudiante');
select prueba.ok((select public.mis_logros() -> 'celebrados' = '["primer_viaje_estudiante"]'::jsonb), 'celebrar dos veces guarda una sola');
select prueba.falla($$select public.celebrar_logro('mil_viajes')$$, 'logros_celebrados_logro_check', 'un logro inventado se rechaza');
select prueba.falla($$select * from public.logros_celebrados$$, 'permission denied', 'nadie lee la tabla directo');

select prueba.como(:'log_cond');
select prueba.ok((select (public.mis_logros() ->> 'viajes_conductor')::int = 10), 'el conductor cuenta sus viajes y su cupo con pasajero');
select prueba.ok((select (public.mis_logros() ->> 'cinco_estrellas')::int = 1), 'el conductor recibió unas 5 estrellas');
select prueba.ok((select public.mis_logros() -> 'celebrados' = '[]'::jsonb), 'las celebraciones de otra persona no se ven');

select prueba.como(:'log_otro');
select prueba.ok((select (public.mis_logros() ->> 'viajes_estudiante')::int = 0), 'otra persona empieza en cero');

select prueba.como(null);
select prueba.ok((select public.mis_logros() is null), 'sin identidad no hay logros');
reset role;
set role anon;
select prueba.falla($$select public.mis_logros()$$, 'permission denied', 'una sesión anónima no puede ver logros');
reset role;
