-- Pruebas de 037 (avisos de emergencia) en la base simulada; nunca contra el proyecto real.
\echo '== Emergencias'
reset role;
select gen_random_uuid() as em_est, gen_random_uuid() as em_cond, gen_random_uuid() as em_cond2, gen_random_uuid() as em_pago,
       gen_random_uuid() as em_otro, gen_random_uuid() as em_admin \gset
insert into auth.users(id, email, raw_user_meta_data) values
  (:'em_est', 'emerg-est@ustavillavo.edu.co', '{"nombre":"Sara Emergencia","rol":"estudiante"}'),
  (:'em_cond', 'emerg-cond@ustavillavo.edu.co', '{"nombre":"Tomás Conductor","rol":"conductor"}'),
  (:'em_cond2', 'emerg-cond2@ustavillavo.edu.co', '{"nombre":"Iván Cupo","rol":"conductor"}'),
  (:'em_pago', 'emerg-pago@ustavillavo.edu.co', '{"nombre":"Lina Pago","rol":"estudiante"}'),
  (:'em_otro', 'emerg-otro@ustavillavo.edu.co', '{"nombre":"Otro Ajeno","rol":"estudiante"}'),
  (:'em_admin', 'emerg-admin@ustavillavo.edu.co', '{"nombre":"Ana Admin","rol":"estudiante"}');
update public.perfiles set es_admin = true where id = :'em_admin';
insert into privado.suscripciones_push (persona_id, endpoint, p256dh, auth)
values (:'em_admin', 'https://push.example.com/emergencias-admin', repeat('k', 40), repeat('a', 16));
select universidad_id as em_u from public.perfiles where id = :'em_est' \gset
insert into public.documentos_conductor(conductor_id, tipo, ruta, estado, autorizado_en)
select c.id, t.tipo, c.id || '/' || t.tipo || '.jpg', 'aprobado', now()
from unnest(array[:'em_cond', :'em_cond2']::uuid[]) c(id) cross join unnest(enum_range(null::public.tipo_documento)) t(tipo);

-- Un viaje en curso (con ubicación del conductor) y un cupo en camino con un puesto pagado.
insert into public.viajes (estudiante_id, universidad_id, origen_lat, origen_lng, origen_texto,
  destino_lat, destino_lng, destino_texto, estado, conductor_id, precio, aceptado_en, iniciado_en)
values (:'em_est', :'em_u', 4.14, -73.63, 'Mi casa', 4.121686, -73.615496, 'USTA', 'en_curso', :'em_cond', 6500, now(), now())
returning id as em_viaje \gset
insert into public.ubicaciones_viaje (viaje_id, conductor_id, lat, lng, actualizado_en) values (:'em_viaje', :'em_cond', 4.135, -73.625, now());
insert into public.cupos(conductor_id, universidad_id, salida_lat, salida_lng, salida_texto,
  destino_lat, destino_lng, destino_texto, sale_en, puestos, precio, estado, iniciado_en)
values (:'em_cond2', :'em_u', 4.15, -73.64, 'Barzal', 4.121686, -73.615496, 'USTA', now(), 2, 6000, 'en_curso', now())
returning id as em_cupo \gset
insert into public.puestos(cupo_id, estudiante_id, recogida_lat, recogida_lng, recogida_texto, estado, pagado)
values (:'em_cupo', :'em_pago', 4.14, -73.63, 'Parque', 'aprobado', 6000);

set role authenticated;
select prueba.como(:'em_est');
select prueba.falla(format($$select public.reportar_emergencia(%L, %L)$$, :'em_viaje', :'em_cupo'), 'Indica el viaje o el cupo', 'un aviso es de un viaje o de un cupo, no de los dos');
select public.reportar_emergencia(:'em_viaje') as em_1 \gset
select prueba.ok((select lat = 4.135 and lng = -73.625 from public.emergencias where id = :'em_1'), 'sin ubicación del teléfono usa la última del conductor');
select prueba.ok((select public.reportar_emergencia(:'em_viaje', null, 4.13, -73.62) = :'em_1'), 'dos toques seguidos no duplican el aviso');
select prueba.ok((select lat = 4.13 from public.emergencias where id = :'em_1'), 'el segundo toque actualiza la ubicación');
select prueba.ok((select count(*) = 1 from public.emergencias), 'quien avisa ve su aviso');
select prueba.falla($$insert into public.emergencias (autor_id) values (auth.uid())$$, 'permission denied', 'nadie escribe la tabla directo');

select prueba.como(:'em_cond');
select prueba.ok((select public.reportar_emergencia(:'em_viaje') is not null), 'el conductor del viaje también puede avisar');
select prueba.ok((select count(*) = 1 from public.emergencias), 'cada uno ve solo sus avisos');

select prueba.como(:'em_pago');
select prueba.ok((select public.reportar_emergencia(null, :'em_cupo') is not null), 'quien pagó su puesto puede avisar en el cupo');

select prueba.como(:'em_otro');
select prueba.falla(format($$select public.reportar_emergencia(%L)$$, :'em_viaje'), 'no está activo', 'alguien ajeno no puede avisar en un viaje');
select prueba.falla(format($$select public.reportar_emergencia(null, %L)$$, :'em_cupo'), 'no está activo', 'alguien ajeno no puede avisar en un cupo');
select prueba.ok((select count(*) = 0 from public.emergencias), 'alguien ajeno no ve avisos de otros');
select prueba.falla(format($$select public.atender_emergencia(%L)$$, :'em_1'), 'Solo un administrador', 'solo un administrador atiende');

select prueba.como(:'em_admin');
select prueba.ok((select count(*) = 3 from public.emergencias where atendida_en is null), 'el administrador ve todos los avisos pendientes');
select public.atender_emergencia(:'em_1');
select prueba.ok((select atendida_por = :'em_admin' from public.emergencias where id = :'em_1'), 'queda registrado quién la atendió');

select prueba.como(:'em_est');
select prueba.ok((select public.reportar_emergencia(:'em_viaje') <> :'em_1'), 'después de atendida, un nuevo toque crea otro aviso');

reset role;
select prueba.ok((select count(*) = 4 and bool_and(personas = array[:'em_admin']::uuid[]) from privado.avisos where titulo = 'Emergencia en un viaje'),
                 'cada aviso nuevo notifica a los administradores');
set role anon;
select prueba.falla(format($$select public.reportar_emergencia(%L)$$, :'em_viaje'), 'permission denied', 'una sesión anónima no puede avisar');
reset role;
