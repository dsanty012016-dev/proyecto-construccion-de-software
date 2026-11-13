-- Pruebas de la pasarela de pagos (023). Solo se ejecutan en la base simulada.
\echo '== Pasarela de pagos'
reset role;
select gen_random_uuid() as pas_lina, gen_random_uuid() as pas_otro \gset
insert into auth.users (id, email, raw_user_meta_data) values
  (:'pas_lina', 'pasarela-lina@ustavillavo.edu.co', '{"nombre":"Lina Paga","rol":"estudiante"}'),
  (:'pas_otro', 'pasarela-otro@ustavillavo.edu.co', '{"nombre":"Otro Paga","rol":"estudiante"}');

-- Arma un aviso como los de Wompi, firmado con el secreto que se le pase.
create function prueba.evento_wompi(
  p_referencia text, p_transaccion text, p_estado text, p_centavos bigint, p_secreto text,
  p_medio text default 'NEQUI', p_moneda text default 'COP'
)
returns jsonb language sql as $$
  select jsonb_build_object(
    'event', 'transaction.updated',
    'data', jsonb_build_object('transaction', jsonb_build_object(
      'id', p_transaccion, 'reference', p_referencia, 'status', p_estado,
      'amount_in_cents', p_centavos, 'currency', p_moneda, 'payment_method_type', p_medio)),
    'environment', 'test',
    'signature', jsonb_build_object(
      'properties', jsonb_build_array('transaction.id', 'transaction.status', 'transaction.amount_in_cents'),
      'checksum', upper(encode(sha256(convert_to(p_transaccion || p_estado || p_centavos || '1530291411' || p_secreto, 'UTF8')), 'hex'))),
    'timestamp', 1530291411
  );
$$;
grant execute on function prueba.evento_wompi(text, text, text, bigint, text, text, text) to anon, authenticated;
\set secreto 'test_events_secreto_de_las_pruebas'

-- Abrir la recarga
set role authenticated;
select prueba.como(:'pas_lina');
select prueba.falla($$select public.iniciar_recarga(19999)$$, 'entre $20.000', 'con la pasarela la recarga mínima es $20.000');
select prueba.falla($$select public.iniciar_recarga(500001)$$, 'entre $20.000', 'y tiene un máximo');
select public.iniciar_recarga(20000) as rec_1 \gset
select prueba.ok((select estado = 'pendiente' and monto = 20000 and transaccion is null from public.recargas where id = :'rec_1'), 'la recarga queda pendiente');
select prueba.ok((select count(*) = 0 from public.billeteras), 'abrir la recarga no da saldo');
select prueba.falla(format($$update public.recargas set estado = 'aprobada' where id = %L$$, :'rec_1'), 'permission denied', 'nadie aprueba su recarga a mano');
select prueba.falla($$insert into public.recargas (persona_id, monto, estado) values (auth.uid(), 20000, 'aprobada')$$, 'permission denied', 'nadie inventa recargas');
select prueba.falla($$select * from privado.ajustes_pago$$, 'permission denied', 'los ajustes de pago no se leen desde la app');
select prueba.como(:'pas_otro');
select prueba.ok((select count(*) = 0 from public.recargas), 'cada quien ve solo sus recargas');

-- El aviso de Wompi llega sin sesión
reset role;
select prueba.como(null);
set role anon;
select prueba.falla(format('select public.confirmar_recarga_wompi(%L)', prueba.evento_wompi(:'rec_1', 'tx-1', 'APPROVED', 2000000, :'secreto')),
  'no está configurada', 'sin el secreto de eventos no se acredita nada');
reset role;
update privado.ajustes_pago set secreto_eventos = :'secreto';
set role anon;

select prueba.falla(format('select public.confirmar_recarga_wompi(%L)', prueba.evento_wompi(:'rec_1', 'tx-1', 'APPROVED', 2000000, 'otro_secreto_cualquiera_123')),
  'Firma inválida', 'un aviso firmado con otro secreto se rechaza');
select prueba.falla(format('select public.confirmar_recarga_wompi(%L)',
    jsonb_set(prueba.evento_wompi(:'rec_1', 'tx-1', 'DECLINED', 2000000, :'secreto'), '{data,transaction,status}', '"APPROVED"')),
  'Firma inválida', 'cambiar el estado después de firmado se nota');
select prueba.falla(format('select public.confirmar_recarga_wompi(%L)',
    jsonb_set(prueba.evento_wompi(:'rec_1', 'tx-1', 'APPROVED', 2000000, :'secreto'), '{signature,properties}', '["transaction.id"]')),
  'Evento inválido', 'la firma tiene que cubrir el estado y el monto');
select prueba.falla($$select public.confirmar_recarga_wompi('[]'::jsonb)$$, 'Evento inválido', 'un aviso con otra forma se rechaza');

select prueba.ok(public.confirmar_recarga_wompi(prueba.evento_wompi(:'rec_1', 'tx-0', 'PENDING', 2000000, :'secreto')) = 'pendiente', 'un pago que sigue en proceso no cambia nada');
select prueba.ok(public.confirmar_recarga_wompi(prueba.evento_wompi(:'rec_1', 'tx-1', 'APPROVED', 9900000, :'secreto')) = 'monto_distinto', 'un pago por otro monto no se acredita');
select prueba.ok(public.confirmar_recarga_wompi(prueba.evento_wompi(:'rec_1', 'tx-1', 'APPROVED', 2000000, :'secreto', 'NEQUI', 'USD')) = 'monto_distinto', 'ni en otra moneda');
select prueba.ok(public.confirmar_recarga_wompi(prueba.evento_wompi(gen_random_uuid()::text, 'tx-9', 'APPROVED', 2000000, :'secreto')) = 'ignorada', 'una referencia que no es nuestra se ignora');
select prueba.ok(public.confirmar_recarga_wompi(prueba.evento_wompi('pedido-123', 'tx-9', 'APPROVED', 2000000, :'secreto')) = 'ignorada', 'y una que no es un id también');
select prueba.ok(public.confirmar_recarga_wompi(prueba.evento_wompi(:'rec_1', 'tx-1', 'APPROVED', 2000000, :'secreto')) = 'aprobada', 'el pago aprobado se acredita');
select prueba.ok(public.confirmar_recarga_wompi(prueba.evento_wompi(:'rec_1', 'tx-1', 'APPROVED', 2000000, :'secreto')) = 'aprobada', 'el aviso repetido responde igual');
select prueba.ok(public.confirmar_recarga_wompi(prueba.evento_wompi(:'rec_1', 'tx-1', 'DECLINED', 2000000, :'secreto')) = 'aprobada', 'una recarga aprobada no se devuelve con otro aviso');

reset role;
select prueba.ok((select saldo = 20000 from public.billeteras where persona_id = :'pas_lina'), 'el saldo sube una sola vez');
select prueba.ok((select count(*) = 1 and min(descripcion) = 'Recarga con Nequi' and min(monto) = 20000
                  from public.movimientos where persona_id = :'pas_lina'), 'y queda un solo movimiento, con el medio de pago');
select prueba.ok((select estado = 'aprobada' and transaccion = 'tx-1' and medio = 'NEQUI' and resuelta_en is not null
                  from public.recargas where id = :'rec_1'), 'la recarga guarda la transacción de Wompi');

-- Pago rechazado y transacción repetida
set role authenticated;
select prueba.como(:'pas_lina');
select public.iniciar_recarga(50000) as rec_2 \gset
select public.iniciar_recarga(20000) as rec_3 \gset
reset role;
select prueba.como(null);
set role anon;
select prueba.ok(public.confirmar_recarga_wompi(prueba.evento_wompi(:'rec_2', 'tx-2', 'DECLINED', 5000000, :'secreto', 'PSE')) = 'rechazada', 'el pago rechazado cierra la recarga');
select prueba.ok(public.confirmar_recarga_wompi(prueba.evento_wompi(:'rec_2', 'tx-2b', 'APPROVED', 5000000, :'secreto', 'PSE')) = 'rechazada', 'y ya no se puede aprobar');
select prueba.ok(public.confirmar_recarga_wompi(prueba.evento_wompi(:'rec_3', 'tx-1', 'APPROVED', 2000000, :'secreto')) = 'ignorada', 'una transacción de Wompi no paga dos recargas');
reset role;
select prueba.ok((select saldo = 20000 from public.billeteras where persona_id = :'pas_lina'), 'ninguno de esos avisos dio saldo');
select prueba.ok((select estado = 'pendiente' from public.recargas where id = :'rec_3'), 'la recarga que no se pagó sigue pendiente');

-- Tope de intentos y de saldo
set role authenticated;
select prueba.como(:'pas_lina');
select public.iniciar_recarga(20000);
select public.iniciar_recarga(20000);
select public.iniciar_recarga(20000);
select public.iniciar_recarga(20000);
select prueba.falla($$select public.iniciar_recarga(20000)$$, 'sin terminar', 'no se abren más de cinco recargas pendientes en una hora');
reset role;
update public.billeteras set saldo = 990000 where persona_id = :'pas_lina';
delete from public.recargas where persona_id = :'pas_lina' and estado = 'pendiente';
set role authenticated;
select prueba.falla($$select public.iniciar_recarga(20000)$$, '$1.000.000', 'no se abre una recarga que pase el tope de saldo');

-- Interruptor de la recarga de prueba
select prueba.como(:'pas_otro');
select public.recargar(5000);
reset role;
update privado.ajustes_pago set recarga_simulada = false;
set role authenticated;
select prueba.falla($$select public.recargar(5000)$$, 'están cerradas', 'con pagos reales se cierra la recarga de prueba');
reset role;
select prueba.ok((select saldo = 5000 from public.billeteras where persona_id = :'pas_otro'), 'y el saldo no cambia');
-- Se deja como viene de fábrica para las pruebas que siguen.
update privado.ajustes_pago set recarga_simulada = true, secreto_eventos = null;
