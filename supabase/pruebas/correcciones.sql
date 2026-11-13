-- Casos de regresión de 021 y 022. Solo se ejecutan en la base simulada.
reset role;
select gen_random_uuid() as fix_est, gen_random_uuid() as fix_otro,
       gen_random_uuid() as fix_pagado, gen_random_uuid() as fix_cond,
       gen_random_uuid() as fix_cond2 \gset
insert into auth.users (id, email, raw_user_meta_data) values
  (:'fix_est', 'correccion-est@ustavillavo.edu.co', '{"nombre":"Estudiante Prueba","rol":"estudiante","telefono":"+573001112233"}'),
  (:'fix_otro', 'correccion-otro@ustavillavo.edu.co', '{"nombre":"Otro Estudiante","rol":"estudiante"}'),
  (:'fix_pagado', 'correccion-pagado@ustavillavo.edu.co', '{"nombre":"Estudiante Pagado","rol":"estudiante"}'),
  (:'fix_cond', 'correccion-cond@ustavillavo.edu.co', '{"nombre":"Conductor Prueba","rol":"conductor","telefono":"+573004445566"}'),
  (:'fix_cond2', 'correccion-cond2@ustavillavo.edu.co', '{"nombre":"Segundo Conductor","rol":"conductor"}');
insert into public.documentos_conductor (conductor_id, tipo, ruta, estado, autorizado_en)
select p.id, t.tipo, p.id || '/' || t.tipo || '.jpg', 'aprobado', now()
from public.perfiles p cross join unnest(enum_range(null::public.tipo_documento)) as t(tipo)
where p.id in (:'fix_cond', :'fix_cond2');
insert into public.vehiculos (conductor_id, placa, marca, modelo, color) values
  (:'fix_cond', 'FIX101', 'Prueba', '2026', 'Blanco'),
  (:'fix_cond2', 'FIX102', 'Prueba', '2026', 'Negro');
set role authenticated;
select prueba.como(:'fix_cond');
select public.publicar_cupo(4.14, -73.63, 'Barrio prueba', now() + interval '20 minutes', 4, 7000) as fix_cupo \gset
select prueba.como(:'fix_cond2');
select public.publicar_cupo(4.14, -73.63, 'Otro barrio', now() + interval '1 hour', 4, 7000) as fix_cupo2 \gset
select prueba.como(:'fix_est');
select public.pedir_puesto(:'fix_cupo', 4.14, -73.63, 'Mi casa') as fix_puesto \gset
select prueba.como(:'fix_cond');
select public.responder_puesto(:'fix_puesto', true);
reset role;
update public.cupos set sale_en = now() + interval '9 minutes' where id = :'fix_cupo';
select prueba.ok(not privado.tiene_cupo_activo(:'fix_est'), 'el puesto sin pagar vencido no bloquea al estudiante antes del cron');
set role authenticated;
select prueba.como(:'fix_est');
select prueba.ok((select count(*) = 0 from public.perfiles where id = :'fix_cond'), 'el puesto vencido deja de dar acceso al teléfono del conductor');
select public.solicitar_viaje(4.14, -73.63, 'Mi casa', 4.121686, -73.615496, 'Universidad') as fix_viaje \gset
select public.cancelar_viaje(:'fix_viaje');
select public.pedir_puesto(:'fix_cupo2', 4.14, -73.63, 'Mi casa') as fix_nuevo_puesto \gset
select public.retirar_puesto(:'fix_cupo2');
select public.retirar_puesto(:'fix_cupo');
reset role;
select prueba.ok((select estado = 'sin_pago' from public.puestos where id = :'fix_puesto'), 'retirar el puesto vencido lo cierra como sin pago');
select prueba.ok((select count(*) = 0 from public.strikes where persona_id = :'fix_est'), 'el vencimiento del puesto no suma strike');
select prueba.ok((select count(*) = 0 from public.movimientos where persona_id = :'fix_est'), 'el vencimiento del puesto no cobra dinero');
insert into public.puestos (cupo_id, estudiante_id, recogida_lat, recogida_lng, recogida_texto, estado, pagado) values
  (:'fix_cupo', :'fix_otro', 4.14, -73.63, 'Casa dos', 'aprobado', 0),
  (:'fix_cupo', :'fix_pagado', 4.14, -73.63, 'Casa tres', 'aprobado', 7000);
select prueba.ok((select privado.vencer_puestos_impagados(sale_en - interval '10 minutes') = 0 from public.cupos where id = :'fix_cupo'), 'el puesto todavía vale en el instante exacto del límite');
select prueba.ok(privado.vencer_puestos_impagados() >= 1, 'la tarea cierra los puestos cuyo pago venció');
select prueba.ok((select estado = 'sin_pago' from public.puestos where cupo_id = :'fix_cupo' and estudiante_id = :'fix_otro'), 'el puesto impagado cambia de estado');
select prueba.ok((select estado = 'aprobado' and pagado = 7000 from public.puestos where cupo_id = :'fix_cupo' and estudiante_id = :'fix_pagado'), 'la tarea conserva los puestos pagados');
set role authenticated;
select prueba.falla($$select privado.vencer_puestos_impagados()$$, 'permission denied', 'nadie ejecuta el cron de puestos desde la app');
reset role;

-- Dos celulares: el éxito del primero no debe perder el reintento del segundo.
insert into privado.suscripciones_push (persona_id, endpoint, p256dh, auth)
values (:'fix_est', 'https://push.example.com/fix1', repeat('p', 87), repeat('a', 22)) returning id as fix_sub1 \gset
insert into privado.suscripciones_push (persona_id, endpoint, p256dh, auth)
values (:'fix_est', 'https://push.example.com/fix2', repeat('p', 87), repeat('a', 22)) returning id as fix_sub2 \gset
insert into privado.avisos (personas, titulo, cuerpo, url)
values (array[:'fix_est']::uuid[], 'Prueba', 'Dos celulares', '/inicio') returning id as fix_aviso \gset
create temp table fix_reserva1 as select * from privado.reservar_entregas(:fix_aviso);
select prueba.ok((select count(*) = 2 from fix_reserva1), 'se reserva una entrega por celular');
select prueba.ok((select enviado_en is null from privado.avisos where id = :fix_aviso), 'reservar no marca el aviso como enviado');
select prueba.ok((select count(*) = 0 from privado.reservar_entregas(:fix_aviso)), 'una reserva vigente impide envíos simultáneos');
select privado.confirmar_entrega(:fix_aviso, suscripcion_id, token_toma, suscripcion_id = :'fix_sub1') from fix_reserva1;
create temp table fix_reserva2 as select * from privado.reservar_entregas(:fix_aviso);
select prueba.ok((select count(*) = 1 and bool_and(suscripcion_id = :'fix_sub2') from fix_reserva2), 'solo se reintenta el celular que falló');
select privado.confirmar_entrega(:fix_aviso, suscripcion_id, token_toma, true) from fix_reserva1 where suscripcion_id = :'fix_sub2';
select prueba.ok((select enviado_en is null from privado.avisos where id = :fix_aviso), 'un token viejo no confirma una nueva reserva');
select privado.confirmar_entrega(:fix_aviso, suscripcion_id, token_toma, true) from fix_reserva2;
select prueba.ok((select enviado_en is not null from privado.avisos where id = :fix_aviso), 'el aviso se completa después de confirmar todos los celulares');
select prueba.ok((select count(*) = 0 from privado.reservar_entregas(:fix_aviso)), 'los celulares confirmados no se envían otra vez');

insert into privado.avisos (personas, titulo, cuerpo, url)
values (array[:'fix_est']::uuid[], 'Reserva perdida', 'Reintento', '/inicio') returning id as fix_aviso2 \gset
create temp table fix_reserva3 as select * from privado.reservar_entregas(:fix_aviso2);
select prueba.ok((select count(*) = 2 from privado.reservar_entregas(:fix_aviso2, now() + interval '3 minutes')), 'una reserva sin confirmar se recupera después de caducar');
update privado.suscripciones_push set persona_id = :'fix_otro' where id = :'fix_sub2';
select prueba.ok((select count(*) = 0 from privado.reservar_entregas(:fix_aviso2, now() + interval '6 minutes') where suscripcion_id = :'fix_sub2'), 'un celular reasociado a otra cuenta no recibe avisos de la anterior');

set role authenticated;
select prueba.como(:'fix_est');
select prueba.falla($$select * from privado.entregas_push$$, 'permission denied', 'las entregas no se leen desde la app');
select prueba.falla(format('select * from privado.reservar_entregas(%s)', :fix_aviso), 'permission denied', 'solo el emisor privado reserva entregas');
select prueba.falla(format('select privado.confirmar_entrega(%s, %L, gen_random_uuid(), true)', :fix_aviso, :'fix_sub1'), 'permission denied', 'nadie confirma entregas desde la app');
reset role;
