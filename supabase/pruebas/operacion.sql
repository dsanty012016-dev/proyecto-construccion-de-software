\echo '== Operaciones de pago, retiros y documentos'
begin;
reset role;
select gen_random_uuid() as ops_estudiante,gen_random_uuid() as ops_conductor,gen_random_uuid() as ops_admin \gset
insert into auth.users(id,email,raw_user_meta_data) values
  (:'ops_estudiante','operacion-estudiante@ustavillavo.edu.co','{"nombre":"Estudiante Operación","rol":"estudiante"}'),
  (:'ops_conductor','operacion-conductor@ustavillavo.edu.co','{"nombre":"Conductor Operación","rol":"conductor"}'),
  (:'ops_admin','operacion-admin@ustavillavo.edu.co','{"nombre":"Admin Operación","rol":"estudiante"}');
update public.perfiles set es_admin=true where id=:'ops_admin';
update privado.ajustes_pago set secreto_eventos='test_events_ejemplo_operacion',recarga_simulada=true,
  saldos_de_prueba_revisados=false,checkout_real_habilitado=false,checkout_pausado=false;

set role authenticated;
select prueba.como(:'ops_estudiante');
select prueba.ok(public.checkout_wompi_disponible('test') and not public.checkout_wompi_disponible('prod'),'solo se habilita el mismo ambiente');
select prueba.falla($$select public.iniciar_recarga_wompi(20000,'prod')$$,'no están disponibles','no se abre una recarga real con base en pruebas');
select prueba.ok(not exists(select 1 from public.recargas),'la apertura bloqueada no crea referencia');
select public.iniciar_recarga_wompi(20000,'test') as ops_recarga \gset
select prueba.ok((select ambiente='test' from public.recargas where id=:'ops_recarga'),'la referencia conserva el ambiente');
reset role;
update privado.ajustes_pago set checkout_pausado=true;
set role authenticated;
select prueba.falla($$select public.iniciar_recarga_wompi(20000,'test')$$,'no están disponibles','pausar impide nuevos checkouts');
reset role;
select prueba.ok(prueba.confirmar_pago(prueba.evento_wompi(:'ops_recarga','ops-transaccion','APPROVED',2000000,'test_events_ejemplo_operacion'))='aprobada','la pausa no impide confirmar recargas abiertas');
select prueba.ok((select count(*)=1 and max(monto)=20000 from public.movimientos where recarga_id=:'ops_recarga'),'el crédito se vincula por referencia');
update privado.ajustes_pago set checkout_pausado=false,recarga_simulada=false,saldos_de_prueba_revisados=true,
  secreto_eventos='prod_events_ejemplo_operacion';
set role authenticated;
select prueba.ok(not public.checkout_wompi_disponible('prod'),'el cambio de ambiente requiere habilitar expresamente checkout real');
reset role;
update privado.ajustes_pago set checkout_real_habilitado=true;
set role authenticated;
select prueba.ok(public.checkout_wompi_disponible('prod') and not public.checkout_wompi_disponible('test'),'la configuración real habilita solo su ambiente');
reset role;
select prueba.ok(prueba.confirmar_pago(jsonb_set(prueba.evento_wompi(:'ops_recarga','ops-ambiente','APPROVED',2000000,'prod_events_ejemplo_operacion'),'{environment}','"prod"'))='en_revision','un aviso real no acredita una referencia Sandbox');
select id as ops_inc from privado.incidencias_pago where recarga_id=:'ops_recarga' and motivo='ambiente_distinto' \gset
set role authenticated;
select prueba.falla($$select public.resumen_operativo()$$,'administradores','el resumen es privado para el equipo');
select prueba.como(:'ops_admin');
select prueba.falla(format($$select public.resolver_incidencia_pago(%L,true,'Revisión','devolucion_externa')$$,:'ops_inc'),'comprobante','la devolución requiere monto y comprobante');
select public.resolver_incidencia_pago(:'ops_inc',true,'Devolución de prueba','devolucion_externa',20000,'OPS-REF-1');
select prueba.ok(exists(select 1 from public.incidencias_conciliacion(true,1) where id=:'ops_inc' and movimiento_id is not null
  and monto_devuelto=20000),'el administrador ve el movimiento exacto y el comprobante');
select prueba.ok((select checkout_real from public.resumen_operativo()),'el equipo ve la habilitación sin leer secretos');
select prueba.como(:'ops_estudiante');
select prueba.ok((select revision_monto=20000 and revision_resuelta_en is not null from public.recargas where id=:'ops_recarga'),'el estudiante ve la revisión completada');
select prueba.ok((select saldo=20000 from public.billeteras),'el cierre no modifica saldo');

select prueba.como(:'ops_conductor');
select public.enviar_documento('licencia',:'ops_conductor'||'/licencia-100.jpg',true);
select public.enviar_documento('licencia',:'ops_conductor'||'/licencia-101.jpg',true);
select id as ops_licencia from public.documentos_conductor where conductor_id=:'ops_conductor' and tipo='licencia' \gset
select prueba.falla(format($$select public.enviar_documento('licencia',%L,true)$$,:'ops_conductor'||'/licencia-100.jpg'),
  'ya fue reemplazado','un archivo retirado queda en espera de eliminación');
reset role;
select prueba.ok((select eliminar_desde=detectado_en+interval '90 days' from privado.documentos_reemplazados where ruta=:'ops_conductor'||'/licencia-100.jpg'),
  'el plazo se cuenta desde el reemplazo');
select prueba.ok(not exists(select 1 from privado.documentos_para_limpiar() where ruta=:'ops_conductor'||'/licencia-100.jpg'),'la limpieza respeta los noventa días');
update privado.documentos_reemplazados set eliminar_desde=now()-interval '1 second' where ruta=:'ops_conductor'||'/licencia-100.jpg';
select prueba.ok(exists(select 1 from privado.documentos_para_limpiar() where ruta=:'ops_conductor'||'/licencia-100.jpg'),'el archivo retirado entra al lote pasado el plazo');
select prueba.ok(not exists(select 1 from privado.documentos_para_limpiar() where ruta=:'ops_conductor'||'/licencia-101.jpg'),'el archivo vigente no entra al lote');
set role authenticated;
select prueba.como(:'ops_admin');
select prueba.falla(format($$select public.revisar_documento_con_vigencia(%L,true)$$,:'ops_licencia'),'fecha de vencimiento','aprobar requiere la fecha de la licencia');
select public.revisar_documento_con_vigencia(:'ops_licencia',true,null,current_date+365);
select prueba.ok((select vence_el=current_date+365 from public.documentos_conductor where id=:'ops_licencia'),'se conserva la fecha del documento revisado');
reset role;
insert into public.retiros(conductor_id,monto,nequi,simulado) values(:'ops_conductor',20000,'3001112233',true)
  returning id as ops_retiro \gset
set role authenticated;
select prueba.como(:'ops_admin');
select public.tomar_retiro(:'ops_retiro');
select public.tomar_retiro(:'ops_retiro');
select prueba.como(:'seg_admin');
select prueba.falla(format($$select public.tomar_retiro(%L)$$,:'ops_retiro'),'no está disponible','otro administrador no toma un retiro ya asignado');
select prueba.falla(format($$select public.revisar_retiro(%L,true,true,'OPS-NEQUI-1')$$,:'ops_retiro'),'Otro administrador','solo el responsable registra el pago');
select prueba.ok((select asignado_a=:'ops_admin' and asignado_en is not null from public.retiros where id=:'ops_retiro'),'el responsable original queda registrado');
rollback;
