\echo '== Historial paginado y cierre de incidencias'
reset role;
select gen_random_uuid() as hist_est, gen_random_uuid() as hist_cond, gen_random_uuid() as hist_otro \gset
insert into auth.users(id,email,raw_user_meta_data) values
  (:'hist_est','historial-uno@ustavillavo.edu.co','{"nombre":"Historial Uno","rol":"estudiante"}'),
  (:'hist_cond','historial-dos@ustavillavo.edu.co','{"nombre":"Historial Dos","rol":"conductor"}'),
  (:'hist_otro','historial-tres@ustavillavo.edu.co','{"nombre":"Historial Tres","rol":"estudiante"}');
select universidad_id as hist_u from public.perfiles where id = :'hist_est' \gset

insert into public.viajes (estudiante_id, universidad_id, origen_lat, origen_lng, origen_texto,
  destino_lat, destino_lng, destino_texto, estado, conductor_id, precio, terminado_en, creado_en)
select :'hist_est', :'hist_u', 4, -73, 'Barrio ' || n, 4.1, -73.1, 'Universidad', 'terminado',
  :'hist_cond', 6000, now() - n * interval '1 day', now() - n * interval '1 day'
from generate_series(1, 31) s(n);

insert into public.viajes (estudiante_id, universidad_id, origen_lat, origen_lng, origen_texto,
  destino_lat, destino_lng, destino_texto, estado, cancelado_en, cancelado_por, creado_en)
values
  (:'hist_est', :'hist_u', 4, -73, 'Origen antiguo', 4.1, -73.1, 'Universidad', 'cancelado',
    now() - interval '50 days', :'hist_est', now() - interval '51 days'),
  (:'hist_otro', :'hist_u', 4, -73, 'Es de otra persona', 4.1, -73.1, 'Universidad', 'cancelado',
    now() - interval '2 days', :'hist_otro', now() - interval '3 days')
returning id, estudiante_id;

insert into public.calificaciones (viaje_id, autor_id, calificado_id, estrellas)
select v.id, :'hist_est', :'hist_cond', 5 from public.viajes v
where v.estudiante_id = :'hist_est' and v.estado = 'terminado' and v.origen_texto <> 'Barrio 31';

insert into public.cupos(conductor_id, universidad_id, salida_lat, salida_lng, salida_texto,
  destino_lat, destino_lng, destino_texto, sale_en, puestos, precio, estado)
values (:'hist_cond', :'hist_u', 4, -73, 'Barrio cupo', 4.1, -73.1, 'Universidad',
  now() - interval '25 days', 2, 6000, 'terminado')
returning id as hist_cupo \gset
insert into public.puestos(cupo_id, estudiante_id, recogida_lat, recogida_lng, recogida_texto, estado, pagado)
values (:'hist_cupo', :'hist_est', 4, -73, 'Parque', 'aprobado', 6000);

set role authenticated;
select prueba.como(:'hist_est');
select prueba.ok((select count(*) = 16 from public.historial_viajes_pagina('todos', 'todos', false, 1)), 'la primera página trae 15 filas y una señal de que hay más');
select prueba.ok((select count(*) = 3 from public.historial_viajes_pagina('todos', 'todos', false, 3)), 'la tercera página conserva los viajes y cupos antiguos');
select prueba.ok((select count(*) = 0 from public.historial_viajes_pagina('todos', 'todos', false, 4)), 'el historial no repite filas después del final');
select prueba.ok(not exists (
  select id from (select * from public.historial_viajes_pagina('todos', 'todos', false, 1) limit 15) a
  intersect select id from public.historial_viajes_pagina('todos', 'todos', false, 2)
), 'las dos páginas visibles no se solapan');
select prueba.ok((select count(*) = 1 from public.historial_viajes_pagina('pedido', 'cancelado', false, 1)), 'al filtrar aparece el viaje cancelado después de más de 30 viajes recientes');
select prueba.ok((select count(*) = 2 from public.historial_viajes_pagina('todos', 'todos', true, 1)), 'pendientes incluye un viaje antiguo y un cupo por calificar');
select prueba.ok((select id = :'hist_cupo' from public.historial_viajes_pagina('cupo', 'terminado', true, 1)), 'el estudiante ve su cupo pagado por calificar');
select prueba.como(:'hist_cond');
select prueba.ok((select id = :'hist_cupo' from public.historial_viajes_pagina('cupo', 'terminado', true, 1)), 'el conductor ve el cupo con un estudiante por calificar');
select prueba.como(:'hist_otro');
select prueba.ok((select count(*) = 1 from public.historial_viajes_pagina('todos', 'todos', false, 1)), 'la sesión solo obtiene las referencias de sus propios viajes y cupos');

reset role;
select id as hist_inc from privado.incidencias_pago where recarga_id = :'seg_rec_a' and motivo = 'anulacion' \gset
select saldo as hist_saldo from public.billeteras where persona_id = :'seg_a' \gset
select count(*) as hist_movimientos from public.movimientos where persona_id = :'seg_a' \gset

set role anon;
select prueba.falla($$select * from public.historial_viajes_pagina('todos','todos',false,1)$$, 'permission denied', 'el historial requiere sesión');
select prueba.falla($$select * from public.historial_incidencias_pago(false,1)$$, 'permission denied', 'las incidencias no se pueden consultar sin sesión');
reset role;
set role authenticated;
select prueba.como(:'hist_est');
select prueba.falla($$select * from public.historial_incidencias_pago(false,1)$$, 'administradores', 'un estudiante no consulta incidencias');
select prueba.falla(format('select public.cerrar_incidencia_pago(%L,true,%L)', :'hist_inc','Verificación'), 'administradores', 'un estudiante no cierra incidencias');
select prueba.como(:'seg_admin');
select prueba.ok(exists(select 1 from public.historial_incidencias_pago(false,1) where id = :'hist_inc' and monto = 20000 and creditos_coincidentes = 1), 'el administrador ve referencia, monto y movimiento coincidente');
select prueba.falla(format('select public.cerrar_incidencia_pago(%L,false,%L)', :'hist_inc','Verificación'), 'comparación', 'el cierre exige confirmar la comparación');
select prueba.falla(format('select public.cerrar_incidencia_pago(%L,true,%L)', :'hist_inc',' '), 'resultado', 'el cierre exige un resultado');
select public.cerrar_incidencia_pago(:'hist_inc', true, '  Contraste guardado en la prueba.  ');
select prueba.ok(exists(select 1 from public.historial_incidencias_pago(true,1) where id = :'hist_inc'
  and revisada_por = :'seg_admin' and resuelta_en is not null and nota_revision = 'Contraste guardado en la prueba.'), 'el cierre conserva responsable, fecha y nota');
select prueba.ok(not exists(select 1 from public.historial_incidencias_pago(false,1) where id = :'hist_inc'), 'la incidencia cerrada sale de pendientes');
select prueba.falla(format('select public.cerrar_incidencia_pago(%L,true,%L)', :'hist_inc','Segundo cierre'), 'ya fue cerrada', 'otro intento no sobrescribe la revisión');
reset role;
select prueba.ok((select saldo = :'hist_saldo' from public.billeteras where persona_id = :'seg_a'), 'revisar una incidencia no cambia el saldo');
select prueba.ok((select count(*) = :'hist_movimientos' from public.movimientos where persona_id = :'seg_a'), 'revisar una incidencia no genera movimientos');
select prueba.ok((select requiere_revision from public.recargas where id = :'seg_rec_a'), 'el cierre administrativo conserva la marca financiera de la recarga');
