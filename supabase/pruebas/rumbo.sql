-- Pruebas de 036 ("Voy para la U" en los cupos de regreso) en la base simulada; nunca contra el proyecto real.
\echo '== Voy para la U'
reset role;
select gen_random_uuid() as ru_cond, gen_random_uuid() as ru_cond2, gen_random_uuid() as ru_cond3, gen_random_uuid() as ru_pago, gen_random_uuid() as ru_sinpago, gen_random_uuid() as ru_otro \gset
insert into auth.users(id, email, raw_user_meta_data) values
  (:'ru_cond', 'rumbo-cond@ustavillavo.edu.co', '{"nombre":"Rumbo Conductor","rol":"conductor"}'),
  (:'ru_cond2', 'rumbo-cond2@ustavillavo.edu.co', '{"nombre":"Rumbo Conductor Dos","rol":"conductor"}'),
  (:'ru_cond3', 'rumbo-cond3@ustavillavo.edu.co', '{"nombre":"Rumbo Conductor Tres","rol":"conductor"}'),
  (:'ru_pago', 'rumbo-pago@ustavillavo.edu.co', '{"nombre":"Rumbo Pago","rol":"estudiante"}'),
  (:'ru_sinpago', 'rumbo-sinpago@ustavillavo.edu.co', '{"nombre":"Rumbo Sin Pago","rol":"estudiante"}'),
  (:'ru_otro', 'rumbo-otro@ustavillavo.edu.co', '{"nombre":"Rumbo Otro","rol":"estudiante"}');
select universidad_id as ru_u from public.perfiles where id = :'ru_cond' \gset
insert into public.documentos_conductor(conductor_id, tipo, ruta, estado, autorizado_en)
select c.id, t.tipo, c.id || '/' || t.tipo || '.jpg', 'aprobado', now()
from unnest(array[:'ru_cond', :'ru_cond2', :'ru_cond3']::uuid[]) c(id)
cross join unnest(enum_range(null::public.tipo_documento)) t(tipo);

-- Un cupo de regreso con un puesto pagado y otro sin pagar; otro de regreso sin pagos y uno de ida
-- (cada conductor tiene un solo cupo activo).
insert into public.cupos(conductor_id, universidad_id, salida_lat, salida_lng, salida_texto,
  destino_lat, destino_lng, destino_texto, sale_en, puestos, precio, estado, sentido)
values (:'ru_cond', :'ru_u', 4.121686, -73.615496, 'USTA Villavicencio', 4.15, -73.64, 'Barzal', now() + interval '1 hour', 3, 6000, 'publicado', 'regreso')
returning id as ru_regreso \gset
insert into public.cupos(conductor_id, universidad_id, salida_lat, salida_lng, salida_texto,
  destino_lat, destino_lng, destino_texto, sale_en, puestos, precio, estado, sentido)
values (:'ru_cond2', :'ru_u', 4.121686, -73.615496, 'USTA Villavicencio', 4.16, -73.65, 'Porfía', now() + interval '3 hours', 2, 6000, 'publicado', 'regreso')
returning id as ru_vacio \gset
insert into public.cupos(conductor_id, universidad_id, salida_lat, salida_lng, salida_texto,
  destino_lat, destino_lng, destino_texto, sale_en, puestos, precio, estado, sentido)
values (:'ru_cond3', :'ru_u', 4.15, -73.64, 'Barzal', 4.121686, -73.615496, 'USTA Villavicencio', now() + interval '1 day', 2, 6000, 'publicado', 'ida')
returning id as ru_ida \gset
insert into public.puestos(cupo_id, estudiante_id, recogida_lat, recogida_lng, recogida_texto, estado, pagado) values
  (:'ru_regreso', :'ru_pago', 4.14, -73.63, 'Mi casa', 'aprobado', 6000),
  (:'ru_regreso', :'ru_sinpago', 4.145, -73.635, 'Otra casa', 'aprobado', 0),
  (:'ru_ida', :'ru_pago', 4.14, -73.63, 'Mi casa', 'aprobado', 6000);

-- Los dos estudiantes tienen avisos activados, para comprobar a quién le llega.
insert into privado.suscripciones_push (persona_id, endpoint, p256dh, auth)
select p, 'https://push.example.com/rumbo-' || p, repeat('k', 40), repeat('a', 16)
from unnest(array[:'ru_pago', :'ru_sinpago']::uuid[]) p;

set role authenticated;
select prueba.como(:'ru_cond');
select prueba.falla(format($$select public.reportar_ubicacion_cupo(%L, 4.13, -73.62)$$, :'ru_regreso'), 'no está en camino', 'antes de avisar no comparte su ubicación');
select prueba.como(:'ru_cond3');
select prueba.falla(format($$select public.voy_para_la_u(%L)$$, :'ru_ida'), 'cupo de regreso', 'en la ida no se avisa "voy para la U"');
select prueba.como(:'ru_cond2');
select prueba.falla(format($$select public.voy_para_la_u(%L)$$, :'ru_vacio'), 'nadie ha pagado', 'sin puestos pagados no hay a quién avisar');
select prueba.como(:'ru_cond');
select prueba.falla(format($$select public.voy_para_la_u(%L)$$, :'ru_vacio'), 'cupo de regreso', 'no puede avisar en el cupo de otro conductor');

select prueba.como(:'ru_pago');
select prueba.falla(format($$select public.voy_para_la_u(%L)$$, :'ru_regreso'), 'cupo de regreso', 'un estudiante no puede avisar por el conductor');

select prueba.como(:'ru_cond');
select public.voy_para_la_u(:'ru_regreso');
select public.voy_para_la_u(:'ru_regreso');
select prueba.ok((select rumbo_a_la_u_en is not null and estado = 'publicado' from public.cupos where id = :'ru_regreso'), 'el cupo queda rumbo a la U, aún publicado');
select public.reportar_ubicacion_cupo(:'ru_regreso', 4.13, -73.62, 12);
select prueba.ok((select count(*) = 1 from public.ubicaciones_cupo where cupo_id = :'ru_regreso'), 'rumbo a la U ya comparte su ubicación');

select prueba.como(:'ru_pago');
select prueba.ok((select count(*) = 1 from public.ubicaciones_cupo where cupo_id = :'ru_regreso'), 'quien pagó ve llegar al conductor');
select prueba.como(:'ru_sinpago');
select prueba.ok((select count(*) = 0 from public.ubicaciones_cupo where cupo_id = :'ru_regreso'), 'quien no ha pagado no ve la ubicación');
select prueba.como(:'ru_otro');
select prueba.ok((select count(*) = 0 from public.ubicaciones_cupo where cupo_id = :'ru_regreso'), 'alguien ajeno al cupo no ve la ubicación');

reset role;
select prueba.ok((select count(*) = 1 and bool_and(personas = array[:'ru_pago']::uuid[]) from privado.avisos where titulo = 'Tu conductor va para la U'),
                 'avisa una sola vez y solo a quien pagó');
update public.cupos set estado = 'cancelado', cancelado_en = now() where id = :'ru_regreso';
select prueba.ok((select count(*) = 0 from public.ubicaciones_cupo where cupo_id = :'ru_regreso'), 'al cancelar se borra la ubicación');
