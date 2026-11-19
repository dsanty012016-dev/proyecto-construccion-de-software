-- Solo en Postgres aislado. Nunca ejecutar estos datos en producción.
\echo '== Seguridad de pagos y retiros'
reset role;
select gen_random_uuid() as seg_a,gen_random_uuid() as seg_b,gen_random_uuid() as seg_cond,
       gen_random_uuid() as seg_admin \gset
insert into auth.users(id,email,raw_user_meta_data) values
(:'seg_a','pago-seguro-a@ustavillavo.edu.co','{"nombre":"Pago A","rol":"estudiante"}'),
(:'seg_b','pago-seguro-b@ustavillavo.edu.co','{"nombre":"Pago B","rol":"estudiante"}'),
(:'seg_cond','retiro-seguro@ustavillavo.edu.co','{"nombre":"Conductor Retiros","rol":"conductor"}'),
(:'seg_admin','admin-retiros@ustavillavo.edu.co','{"nombre":"Admin Retiros","rol":"estudiante"}');
update public.perfiles set es_admin=true where id=:'seg_admin';
update privado.ajustes_pago set secreto_eventos='test_events_secreto_de_las_pruebas';
set role authenticated;
select prueba.como(:'seg_a');
select public.iniciar_recarga(20000) as seg_rec_a \gset
select prueba.como(:'seg_b');
select public.iniciar_recarga(20000) as seg_rec_b \gset
reset role;
select prueba.evento_wompi(:'seg_rec_a','seg-tx-a','APPROVED',2000000,'test_events_secreto_de_las_pruebas') as seg_evento \gset
select prueba.ok(prueba.confirmar_pago(
  jsonb_set(:'seg_evento'::jsonb,'{data,transaction,reference}',to_jsonb(:'seg_rec_b'::text)),
  :'seg_evento'::jsonb #> '{data,transaction}')='aprobada','la referencia no firmada del aviso no elige quién recibe el saldo');
select prueba.ok((select saldo=20000 from public.billeteras where persona_id=:'seg_a'),'se acredita la referencia obtenida del proveedor');
select prueba.ok((select estado='pendiente' from public.recargas where id=:'seg_rec_b'),'la recarga de la referencia alterada sigue sin acreditarse');
select prueba.falla(format('select * from privado.validar_evento_pago(%L)',
  jsonb_set(:'seg_evento'::jsonb,'{environment}','"prod"')),'Ambiente','un aviso no cambia de ambiente aunque su firma no cubra ese campo');
set role anon;
select prueba.falla($$select * from privado.validar_evento_pago('{}')$$,'permission denied','nadie valida ni confirma pagos desde la API privada');
select prueba.falla($$select privado.confirmar_pago_verificado('{}','{}')$$,'permission denied','la confirmación acreditadora no es pública');
set role authenticated;
select prueba.falla($$select privado.confirmar_recarga_wompi('{}')$$,'permission denied','el camino de acreditación antiguo queda desactivado');
reset role;
select prueba.ok(to_regprocedure('public.confirmar_recarga_wompi(jsonb)') is null,'no queda una RPC pública alternativa para acreditar');

-- Dos pagos abiertos antes de que el proveedor confirme: el segundo no rompe el tope.
insert into public.billeteras(persona_id,saldo) values(:'seg_b',900000);
set role authenticated;
select prueba.como(:'seg_b');
select public.iniciar_recarga(100000) as seg_tope_1 \gset
select public.iniciar_recarga(100000) as seg_tope_2 \gset
reset role;
select prueba.ok(prueba.confirmar_pago(prueba.evento_wompi(:'seg_tope_1','seg-tope-1','APPROVED',10000000,'test_events_secreto_de_las_pruebas'))='aprobada','el primer pago alcanza el saldo máximo');
select prueba.ok(prueba.confirmar_pago(prueba.evento_wompi(:'seg_tope_2','seg-tope-2','APPROVED',10000000,'test_events_secreto_de_las_pruebas'))='en_revision','el pago cobrado que excede el tope queda para conciliación');
select prueba.ok((select saldo=1000000 from public.billeteras where persona_id=:'seg_b'),'el saldo no supera el millón al confirmar varios pagos');
select prueba.ok(exists(select 1 from privado.incidencias_pago where recarga_id=:'seg_tope_2' and motivo='limite_saldo'),'no se pierde el registro del dinero que necesita revisión');
select prueba.ok(prueba.confirmar_pago(prueba.evento_wompi(:'seg_rec_a','seg-tx-a','VOIDED',2000000,'test_events_secreto_de_las_pruebas'))='en_revision','la anulación posterior a una aprobación deja una incidencia');
select prueba.ok((select saldo=20000 from public.billeteras where persona_id=:'seg_a'),'una anulación no descuenta automáticamente dinero sin revisión');

-- Retiros: documentación, importe, reserva, permisos y resolución idempotente.
insert into public.billeteras(persona_id,saldo) values(:'seg_cond',100000);
insert into public.movimientos(persona_id,tipo,monto,saldo_despues,descripcion)
values(:'seg_cond','ganancia',60000,100000,'Ganancias de prueba');
set role authenticated;
select prueba.como(:'seg_cond');
select prueba.falla($$select public.solicitar_retiro(20000,'3001112233')$$,'documentos','sin documentos aprobados no se pide retiro');
reset role;
insert into public.documentos_conductor(conductor_id,tipo,ruta,estado,autorizado_en)
select :'seg_cond',t.tipo,:'seg_cond'||'/'||t.tipo||'.jpg','aprobado',now()
from unnest(enum_range(null::public.tipo_documento)) t(tipo);
set role authenticated;
select prueba.como(:'seg_cond');
select prueba.falla($$select public.solicitar_retiro(19999,'3001112233')$$,'mínimo','se aplica el retiro mínimo de veinte mil');
select prueba.falla($$select public.solicitar_retiro(20000,'1234')$$,'Nequi','el número de Nequi debe ser válido');
select prueba.falla($$select public.solicitar_retiro(70000,'3001112233')$$,'ganancias','las recargas no se convierten en ganancias retirables');
select public.solicitar_retiro(40000,'3001112233') as seg_retiro_1 \gset
select prueba.ok((select saldo=60000 from public.billeteras where persona_id=:'seg_cond'),'el dinero del retiro se aparta una vez');
select prueba.ok((select disponible=20000 from public.opciones_de_retiro()),'las ganancias disponibles descuentan el retiro pendiente');
select prueba.ok((select plazo_hasta=solicitado_en+interval '7 days' and simulado from public.retiros where id=:'seg_retiro_1'),'el plazo es siete días y no se convierte una prueba en retiro real');
select prueba.falla($$select public.solicitar_retiro(30000,'3001112233')$$,'ganancias','no se puede solicitar el mismo dinero en otro retiro');
select prueba.falla(format('select public.revisar_retiro(%L,true,true,%L)',:'seg_retiro_1','NEQUI-PRUEBA-1'),'administradores','el conductor no se aprueba su retiro');
select prueba.como(:'seg_a');
select prueba.ok((select count(*)=0 from public.retiros),'otro estudiante no ve el Nequi ni los retiros del conductor');
select prueba.falla($$insert into public.retiros(conductor_id,monto,nequi,simulado) values(auth.uid(),20000,'3001112233',true)$$,'permission denied','nadie crea un retiro saltándose la reserva');
select prueba.como(:'seg_admin');
select prueba.falla(format('select public.revisar_retiro(%L,true,true,%L)',:'seg_retiro_1','NEQUI-PRUEBA-1'),'Toma la solicitud','el pago requiere asignación previa');
select public.tomar_retiro(:'seg_retiro_1');
select prueba.falla(format('select public.revisar_retiro(%L,true,false,%L)',:'seg_retiro_1','NEQUI-PRUEBA-1'),'documentos','el admin confirma la revisión de cédula y titularidad');
select public.revisar_retiro(:'seg_retiro_1',true,true,'NEQUI-PRUEBA-1');
select public.revisar_retiro(:'seg_retiro_1',true,true,'NEQUI-PRUEBA-1');
reset role;
select prueba.ok((select saldo=60000 from public.billeteras where persona_id=:'seg_cond'),'registrar un pago repetido no vuelve a descontar saldo');
select prueba.ok((select estado='pagado' and revisado_por=:'seg_admin' and documentos_revisados_en is not null from public.retiros where id=:'seg_retiro_1'),'queda quién revisó y el comprobante del pago');
set role authenticated;
select prueba.como(:'seg_cond');
select public.solicitar_retiro(20000,'3001112233') as seg_retiro_2 \gset
select prueba.como(:'seg_admin');
select public.revisar_retiro(:'seg_retiro_2',false,false,null,'No coincide la titularidad');
select public.revisar_retiro(:'seg_retiro_2',false,false,null,'No coincide la titularidad');
reset role;
select prueba.ok((select saldo=60000 from public.billeteras where persona_id=:'seg_cond'),'rechazar dos veces devuelve el dinero una sola vez');
select prueba.ok((select count(*)=1 from public.movimientos where persona_id=:'seg_cond' and tipo='retiro_devuelto'),'la devolución tiene un único movimiento');
set role authenticated;
select prueba.como(:'seg_cond');
select prueba.falla($$select * from public.incidencias_de_pago()$$,'administradores','las incidencias financieras solo las revisa un admin');
select prueba.como(:'seg_admin');
select prueba.ok((select count(*)>=1 from public.incidencias_de_pago()),'el administrador puede consultar los pagos que requieren revisión');
reset role;
-- La configuración de producción no convierte automáticamente el saldo ficticio.
begin;
update privado.ajustes_pago set secreto_eventos='prod_events_secreto_de_prueba',recarga_simulada=false;
select prueba.falla(format('select * from privado.validar_evento_pago(%L)',
  jsonb_set(prueba.evento_wompi(:'seg_rec_a','seg-prod','APPROVED',2000000,'prod_events_secreto_de_prueba'),'{environment}','"prod"')),
  'saldos de prueba','producción exige revisión explícita de los saldos ficticios');
update privado.ajustes_pago set saldos_de_prueba_revisados=true,recarga_simulada=true;
select prueba.falla(format('select * from privado.validar_evento_pago(%L)',
  jsonb_set(prueba.evento_wompi(:'seg_rec_a','seg-prod','APPROVED',2000000,'prod_events_secreto_de_prueba'),'{environment}','"prod"')),
  'saldos de prueba','producción también exige cerrar las recargas ficticias');
rollback;
update privado.ajustes_pago set secreto_eventos=null;
