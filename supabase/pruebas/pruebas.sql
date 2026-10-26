-- Pruebas de las migraciones: registro, RLS y funciones RPC de los viajes.
-- Se corren con supabase/pruebas/correr.sh sobre un Postgres vacío, después de
-- 00-supabase-simulado.sql y de supabase/migraciones/*.sql.
-- Cualquier "FALLA" detiene el script con error.

\set ON_ERROR_STOP on
\set QUIET on
set client_min_messages = notice;

-- ---------------------------------------------------------------------------
-- Ayudas
-- ---------------------------------------------------------------------------
create schema prueba;
grant usage on schema prueba to anon, authenticated;

create function prueba.ok(condicion boolean, descripcion text)
returns void language plpgsql as $$
begin
  if condicion is not true then
    raise exception 'FALLA: %', descripcion;
  end if;
  raise notice 'ok: %', descripcion;
end;
$$;

-- Ejecuta una sentencia que DEBE fallar con un mensaje que contenga "mensaje".
create function prueba.falla(sentencia text, mensaje text, descripcion text)
returns void language plpgsql as $$
begin
  begin
    execute sentencia;
  exception when others then
    if sqlerrm ilike '%' || mensaje || '%' then
      raise notice 'ok: %', descripcion;
      return;
    end if;
    raise exception 'FALLA: % (dio otro error: %)', descripcion, sqlerrm;
  end;
  raise exception 'FALLA: % (no dio error)', descripcion;
end;
$$;

-- Cambia la persona que "inició sesión".
create function prueba.como(p_id uuid)
returns void language sql as $$
  select set_config('request.jwt.claim.sub', coalesce(p_id::text, ''), false);
$$;

grant execute on all functions in schema prueba to anon, authenticated;

\set ana   '00000000-0000-0000-0000-0000000000a1'
\set beto  '00000000-0000-0000-0000-0000000000b2'
\set carlos '00000000-0000-0000-0000-0000000000c3'
\set diana '00000000-0000-0000-0000-0000000000d4'
\set eva   '00000000-0000-0000-0000-0000000000e5'
\set gabo  '00000000-0000-0000-0000-0000000000f6'
\set hugo  '00000000-0000-0000-0000-0000000000a7'

-- ---------------------------------------------------------------------------
-- 1. Registro: solo correos institucionales
-- ---------------------------------------------------------------------------
\echo '== Registro'

insert into auth.users (id, email, raw_user_meta_data) values
  (:'ana', 'ana@ustavillavo.edu.co', '{"nombre":"Ana Rojas","telefono":"+573001112233","rol":"estudiante"}'),
  (:'beto', 'BETO@UstaVillavo.edu.co', '{"nombre":"Beto Díaz","rol":"estudiante"}'),
  (:'carlos', 'carlos@ustavillavo.edu.co', '{"nombre":"Carlos Pérez","telefono":"+57 300 444 5566","rol":"conductor"}'),
  (:'diana', 'diana@ustavillavo.edu.co', '{"nombre":"Diana Mora","rol":"conductor"}'),
  (:'eva', 'eva@ustavillavo.edu.co', '{"nombre":"Eva Ruiz","rol":"conductor"}'),
  -- Entra con Google: trae full_name y no trae rol.
  (:'gabo', 'gabo@ustavillavo.edu.co', '{"full_name":"Gabo Google"}');

-- Otra universidad, para comprobar que no se mezclan.
insert into public.universidades (nombre, ciudad, dominio_correo) values ('Universidad de Prueba', 'Villavicencio', 'prueba.edu.co');
insert into auth.users (id, email, raw_user_meta_data) values
  (:'hugo', 'hugo@prueba.edu.co', '{"nombre":"Hugo Otra","rol":"conductor"}');

select prueba.ok((select count(*) = 7 from public.perfiles), 'se crea un perfil por cada registro válido');
select prueba.ok((select telefono = '+573004445566' from public.perfiles where id = :'carlos'), 'el teléfono se guarda sin espacios');
select prueba.ok((select nombre = 'Gabo Google' and rol is null from public.perfiles where id = :'gabo'), 'con Google el nombre sale de full_name y el rol queda pendiente');

select prueba.falla($$insert into auth.users (email) values ('alguien@gmail.com')$$, 'correo institucional', 'rechaza correos de otros dominios');
select prueba.falla($$insert into auth.users (email) values ('x@ustavillavo.edu.co.falso.com')$$, 'correo institucional', 'rechaza dominios que solo empiezan igual');
select prueba.falla($$insert into auth.users (email) values ('x@otra.com@ustavillavo.edu.co')$$, 'correo institucional', 'rechaza correos con dos @ (dominio al final)');
select prueba.falla($$insert into auth.users (email) values ('x@ustavillavo.edu.co@otro.com')$$, 'correo institucional', 'rechaza correos con dos @ (dominio en medio)');
select prueba.falla($$insert into auth.users (email) values ('@ustavillavo.edu.co')$$, 'correo institucional', 'rechaza correos sin usuario');
select prueba.falla($$insert into auth.users (email, raw_user_meta_data) values ('tel@ustavillavo.edu.co', '{"telefono":"3001234"}')$$, 'teléfono', 'rechaza teléfonos mal escritos');
select prueba.falla(format('update auth.users set email = %L where id = %L', 'ana@gmail.com', :'ana'), 'correo institucional', 'no deja cambiar el correo a uno no institucional');

-- Documentos ya aprobados para los conductores de estas pruebas (011): así
-- las secciones de viajes y cupos prueban sus reglas sin el trámite.
insert into public.documentos_conductor (conductor_id, tipo, ruta, estado, autorizado_en)
select p.id, t.tipo, p.id || '/' || t.tipo || '.jpg', 'aprobado', now()
from public.perfiles p
cross join unnest(enum_range(null::public.tipo_documento)) as t(tipo)
where p.id in (:'carlos', :'diana', :'eva', :'hugo');

-- Saldo de prueba para todos (012): así las secciones anteriores a la
-- billetera prueban sus reglas sin recargar. La billetera se prueba en 8e.
insert into public.billeteras (persona_id, saldo) select id, 200000 from public.perfiles;

-- ---------------------------------------------------------------------------
-- 2. Perfiles
-- ---------------------------------------------------------------------------
\echo '== Perfiles'
set role authenticated;

select prueba.como(:'ana');
select prueba.ok((select count(*) = 1 from public.perfiles), 'cada quien ve solo su perfil');
select prueba.falla($$update public.perfiles set rol = 'conductor'$$, 'permission denied', 'no se puede cambiar el rol a mano');
select prueba.falla($$update public.perfiles set disponible = true$$, 'permission denied', 'no se puede cambiar la disponibilidad a mano');
select prueba.falla($$insert into public.perfiles (id, universidad_id, nombre) values (gen_random_uuid(), 1, 'Falso')$$, 'permission denied', 'no se pueden crear perfiles a mano');
update public.perfiles set nombre = 'Ana María Rojas';
select prueba.ok((select nombre = 'Ana María Rojas' from public.perfiles where id = :'ana'), 'se puede editar el propio nombre');
update public.perfiles set nombre = 'Hackeado' where id = :'beto';
reset role;
select prueba.ok((select nombre = 'Beto Díaz' from public.perfiles where id = :'beto'), 'no se puede editar el perfil de otro');
set role authenticated;

select prueba.como(:'gabo');
select public.elegir_rol('estudiante');
select prueba.ok((select rol = 'estudiante' from public.perfiles), 'quien entró con Google elige su rol');
select prueba.falla($$select public.elegir_rol('conductor')$$, 'ya está definido', 'el rol no se puede cambiar después');

-- ---------------------------------------------------------------------------
-- 3. Vehículos y disponibilidad
-- ---------------------------------------------------------------------------
\echo '== Vehículos'

select prueba.como(:'ana');
select prueba.falla(format('insert into public.vehiculos (conductor_id, placa, marca, modelo, color) values (%L, %L, %L, %L, %L)', :'ana', 'AAA111', 'Kia', 'Picanto', 'Rojo'), 'row-level security', 'un estudiante no registra vehículo');
select prueba.falla($$select public.cambiar_disponibilidad(true)$$, 'Solo los conductores', 'un estudiante no se pone disponible');

select prueba.como(:'carlos');
insert into public.vehiculos (conductor_id, placa, marca, modelo, color) values (:'carlos', 'ABC123', 'Chevrolet', 'Spark', 'Gris');
select prueba.falla(format('insert into public.vehiculos (conductor_id, placa, marca, modelo, color) values (%L, %L, %L, %L, %L)', :'diana', 'ZZZ999', 'Kia', 'Rio', 'Azul'), 'row-level security', 'no se registra un vehículo a nombre de otro');
select prueba.falla($$update public.vehiculos set placa = 'abc 123'$$, 'check', 'la placa debe tener el formato colombiano');
select public.cambiar_disponibilidad(true);

select prueba.como(:'diana');
insert into public.vehiculos (conductor_id, placa, marca, modelo, color) values (:'diana', 'XYZ12D', 'Yamaha', 'NMAX', 'Negro');
select public.cambiar_disponibilidad(true);
select prueba.ok((select count(*) = 1 from public.vehiculos), 'el conductor ve solo su vehículo');

select prueba.como(:'eva');
select prueba.falla($$select public.cambiar_disponibilidad(true)$$, 'Registra tu vehículo', 'sin vehículo no se pone disponible');

select prueba.como(:'hugo');
insert into public.vehiculos (conductor_id, placa, marca, modelo, color) values (:'hugo', 'HUG001', 'Renault', 'Logan', 'Blanco');
select public.cambiar_disponibilidad(true);

-- ---------------------------------------------------------------------------
-- 4. Pedir viaje
-- ---------------------------------------------------------------------------
\echo '== Pedir viaje'

select prueba.como(:'ana');
select public.solicitar_viaje(4.142, -73.626, ' Barrio La Esperanza ', 4.121686, -73.615496, 'USTA Villavicencio') as viaje_ana \gset
select prueba.ok((select estado = 'solicitado' and origen_texto = 'Barrio La Esperanza' from public.viajes where id = :'viaje_ana'), 'el viaje queda solicitado y sin espacios sobrantes');
select prueba.falla($$select public.solicitar_viaje(4.1, -73.6, 'Otra casa', 4.121686, -73.615496, 'USTA')$$, 'Ya tienes un viaje activo', 'un estudiante no tiene dos viajes activos');
select prueba.falla($$insert into public.viajes (estudiante_id, universidad_id, origen_lat, origen_lng, origen_texto, destino_lat, destino_lng, destino_texto) select id, 1, 1, 1, 'a', 2, 2, 'b' from public.perfiles$$, 'permission denied', 'no se insertan viajes a mano');

select prueba.como(:'beto');
select prueba.falla($$select public.solicitar_viaje(4.121686, -73.615496, 'Casa', 4.1217, -73.6155, 'Casa')$$, 'Revisa el origen', 'origen y destino no pueden ser el mismo punto');
select prueba.falla($$select public.solicitar_viaje(95, -73.6, 'Casa', 4.121686, -73.615496, 'USTA')$$, 'Revisa el origen', 'coordenadas fuera de rango');
select prueba.ok((select count(*) = 0 from public.viajes), 'un estudiante no ve los viajes de otros');
select public.solicitar_viaje(4.15, -73.64, 'Barrio El Buque', 4.121686, -73.615496, 'USTA Villavicencio') as viaje_beto \gset

select prueba.como(:'carlos');
select prueba.falla($$select public.solicitar_viaje(4.1, -73.6, 'Casa', 4.121686, -73.615496, 'USTA')$$, 'Solo los estudiantes', 'un conductor no pide viajes');
select prueba.ok((select count(*) = 2 from public.viajes), 'un conductor disponible ve las solicitudes');

select prueba.como(:'eva');
select prueba.ok((select count(*) = 0 from public.viajes), 'un conductor no disponible no ve solicitudes');

select prueba.como(:'hugo');
select prueba.ok((select count(*) = 0 from public.viajes), 'un conductor de otra universidad no ve las solicitudes');
select prueba.falla(format('select public.ofertar(%L, 7000)', :'viaje_ana'), 'ya no está disponible', 'ni puede ofertar en ellas');

-- ---------------------------------------------------------------------------
-- 5. Ofertas
-- ---------------------------------------------------------------------------
\echo '== Ofertas'

select prueba.como(:'carlos');
select public.ofertar(:'viaje_ana', 8000) as oferta_carlos \gset
select public.ofertar(:'viaje_ana', 7500) as oferta_carlos_2 \gset
select prueba.ok(:'oferta_carlos' = :'oferta_carlos_2', 'volver a ofertar actualiza la misma oferta');
select prueba.ok((select precio = 7500 from public.ofertas where id = :'oferta_carlos'), 'el precio nuevo queda guardado');
select prueba.falla(format('select public.ofertar(%L, 500)', :'viaje_ana'), 'precio', 'precio por debajo del mínimo');
select prueba.falla(format('select public.ofertar(%L, 150000)', :'viaje_ana'), 'precio', 'precio por encima del máximo');
select public.ofertar(:'viaje_beto', 9000) as oferta_carlos_beto \gset

select prueba.como(:'diana');
select public.ofertar(:'viaje_ana', 7000) as oferta_diana \gset
select prueba.ok((select count(*) = 1 from public.ofertas), 'un conductor no ve las ofertas de otros conductores');

select prueba.como(:'eva');
select prueba.falla(format('select public.ofertar(%L, 7000)', :'viaje_ana'), 'Ponte disponible', 'un conductor no disponible no oferta');

select prueba.como(:'ana');
select prueba.falla(format('select public.ofertar(%L, 7000)', :'viaje_ana'), 'Ponte disponible', 'un estudiante no oferta');
select prueba.ok((select count(*) = 2 from public.ofertas), 'el estudiante ve las ofertas de su viaje');
select prueba.ok((select count(*) = 2 from public.vehiculos), 'el estudiante ve los vehículos de quienes le ofertan');
select prueba.ok((select count(*) = 1 from public.perfiles), 'antes de aceptar no ve el perfil completo (teléfono) del conductor');
select prueba.ok((select count(*) = 2 from public.perfiles_publicos(array[:'carlos', :'diana']::uuid[])), 'sí ve nombre y reputación de quienes le ofertan');
select prueba.ok((select count(*) = 0 from public.perfiles_publicos(array[:'hugo']::uuid[])), 'no ve perfiles públicos de otra universidad');

select prueba.como(:'beto');
select prueba.ok((select count(*) = 1 from public.ofertas), 'otro estudiante solo ve las ofertas de su propio viaje');
select prueba.ok((select count(*) = 1 from public.vehiculos), 'y solo los vehículos de quien le ofertó');
select prueba.falla(format('select public.aceptar_oferta(%L)', :'oferta_diana'), 'no existe', 'no se acepta una oferta de un viaje ajeno');

-- ---------------------------------------------------------------------------
-- 6. Aceptar
-- ---------------------------------------------------------------------------
\echo '== Aceptar'

select prueba.como(:'ana');
select public.aceptar_oferta(:'oferta_carlos');
reset role;
select prueba.ok((select estado = 'aceptado' and conductor_id = :'carlos' and precio = 7500 from public.viajes where id = :'viaje_ana'), 'aceptar asigna conductor y precio');
select prueba.ok((select estado = 'rechazada' from public.ofertas where id = :'oferta_diana'), 'las demás ofertas del viaje quedan rechazadas');
select prueba.ok((select estado = 'retirada' from public.ofertas where id = :'oferta_carlos_beto'), 'las ofertas del conductor en otros viajes se retiran');
set role authenticated;

select prueba.como(:'beto');
select prueba.falla(format('select public.aceptar_oferta(%L)', :'oferta_carlos_beto'), 'retiró', 'no se acepta una oferta retirada');

select prueba.como(:'carlos');
select prueba.falla(format('select public.ofertar(%L, 9000)', :'viaje_beto'), 'Termina tu viaje actual', 'un conductor con viaje no oferta en otro');
select prueba.ok((select count(*) = 1 from public.viajes where estado = 'solicitado'), 'sigue viendo solicitudes, pero no puede ofertar');
select prueba.ok((select telefono = '+573001112233' from public.perfiles where id = :'ana'), 'el conductor ve el teléfono del estudiante durante el viaje');

select prueba.como(:'ana');
select prueba.ok((select count(*) = 2 from public.perfiles), 'el estudiante ve el perfil completo de su conductor');
select prueba.ok((select count(*) = 1 from public.vehiculos), 'y solo el vehículo de su conductor');
select prueba.falla(format('select public.aceptar_oferta(%L)', :'oferta_diana'), 'ya no está buscando', 'no se acepta otra oferta después');

select prueba.como(:'diana');
select prueba.ok((select count(*) = 0 from public.perfiles where id = :'ana'), 'el conductor rechazado no ve el perfil del estudiante');

-- ---------------------------------------------------------------------------
-- 7. Iniciar, terminar y calificar
-- ---------------------------------------------------------------------------
\echo '== Iniciar, terminar, calificar'

select prueba.como(:'diana');
select prueba.falla(format('select public.iniciar_viaje(%L)', :'viaje_ana'), 'No puedes iniciar', 'otro conductor no inicia el viaje');
select prueba.falla(format('select public.cancelar_viaje(%L)', :'viaje_ana'), 'No puedes cancelar', 'otro conductor no cancela el viaje');

select prueba.como(:'carlos');
select prueba.falla(format('select public.terminar_viaje(%L)', :'viaje_ana'), 'No puedes terminar', 'no se termina sin iniciar');
select public.iniciar_viaje(:'viaje_ana');

select prueba.como(:'ana');
select prueba.falla(format('select public.cancelar_viaje(%L)', :'viaje_ana'), 'No puedes cancelar', 'en curso ya no se cancela');
select prueba.falla(format('select public.calificar(%L, 5)', :'viaje_ana'), 'terminados', 'no se califica antes de terminar');

select prueba.como(:'carlos');
select public.terminar_viaje(:'viaje_ana');

select prueba.como(:'ana');
select public.calificar(:'viaje_ana', 5, '  Muy puntual  ');
select prueba.falla(format('select public.calificar(%L, 4)', :'viaje_ana'), 'Ya calificaste', 'se califica una sola vez');
select prueba.falla(format('select public.calificar(%L, 6)', :'viaje_ana'), '1 a 5', 'las estrellas van de 1 a 5');
select prueba.ok((select count(*) = 1 from public.perfiles), 'terminado el viaje, ya no ve el perfil completo del conductor');
select prueba.ok((select calificacion = 5.0 and viajes_terminados = 1 from public.perfiles_publicos(array[:'carlos']::uuid[])), 'el promedio y los viajes del conductor se actualizan');

select prueba.como(:'beto');
select prueba.falla(format('select public.calificar(%L, 1)', :'viaje_ana'), 'No puedes calificar', 'nadie ajeno califica el viaje');

select prueba.como(:'carlos');
select public.calificar(:'viaje_ana', 4);
select prueba.ok((select count(*) = 2 from public.calificaciones), 'el conductor ve la que hizo y la que recibió');
select prueba.ok((select comentario = 'Muy puntual' from public.calificaciones where autor_id = :'ana'), 'el comentario se guarda sin espacios sobrantes');

-- ---------------------------------------------------------------------------
-- 8. Cancelar y disponibilidad
-- ---------------------------------------------------------------------------
\echo '== Cancelar y disponibilidad'

select prueba.como(:'diana');
select public.ofertar(:'viaje_beto', 6000) as oferta_diana_beto \gset
select prueba.falla(format('select public.cancelar_viaje(%L)', :'viaje_beto'), 'No puedes cancelar', 'quien solo ofertó no cancela el viaje');
select public.cambiar_disponibilidad(false);
select prueba.ok((select estado = 'retirada' from public.ofertas where id = :'oferta_diana_beto'), 'al dejar de estar disponible se retiran sus ofertas');
select prueba.ok((select count(*) = 0 from public.viajes where estado = 'solicitado'), 'y deja de ver solicitudes');

select prueba.como(:'beto');
select public.cancelar_viaje(:'viaje_beto');
select prueba.ok((select estado = 'cancelado' and cancelado_por = :'beto' from public.viajes where id = :'viaje_beto'), 'el estudiante cancela su solicitud');
select public.solicitar_viaje(4.15, -73.64, 'Barrio El Buque', 4.121686, -73.615496, 'USTA Villavicencio') as viaje_beto_2 \gset

select prueba.como(:'carlos');
select public.ofertar(:'viaje_beto_2', 6500) as oferta_carlos_beto_2 \gset
select prueba.como(:'beto');
select public.aceptar_oferta(:'oferta_carlos_beto_2');
select prueba.como(:'carlos');
select public.cancelar_viaje(:'viaje_beto_2');
select prueba.ok((select estado = 'cancelado' and cancelado_por = :'carlos' from public.viajes where id = :'viaje_beto_2'), 'el conductor asignado puede cancelar un viaje aceptado');

-- Borrar el vehículo apaga la disponibilidad.
delete from public.vehiculos;
reset role;
select prueba.ok((select not disponible from public.perfiles where id = :'carlos'), 'sin vehículo, el conductor deja de estar disponible');
set role authenticated;

-- ---------------------------------------------------------------------------
-- 8b. Cambio de modo (009)
-- ---------------------------------------------------------------------------
\echo '== Cambio de modo'

select prueba.como(:'beto');
select public.cambiar_modo('conductor');
reset role;
select prueba.ok((select rol = 'conductor' and not disponible from public.perfiles where id = :'beto'), 'un estudiante sin viaje activo pasa a conductor');
set role authenticated;
select prueba.falla($$select public.solicitar_viaje(4.15, -73.64, 'X', 4.121686, -73.615496, 'U')$$, 'Solo los estudiantes', 'en modo conductor no pide viajes');
select public.cambiar_modo('conductor');
select prueba.ok((select rol = 'conductor' from public.perfiles), 'pedir el mismo modo no hace nada');
select public.cambiar_modo('estudiante');
select prueba.ok((select rol = 'estudiante' from public.perfiles), 'y puede volver a estudiante');
select public.solicitar_viaje(4.15, -73.64, 'Barrio El Buque', 4.121686, -73.615496, 'USTA Villavicencio') as viaje_beto_3 \gset
select prueba.falla($$select public.cambiar_modo('conductor')$$, 'Termina o cancela tu viaje', 'con un viaje pedido no cambia de modo');

-- Conductora con una oferta activa pasa a estudiante.
select prueba.como(:'diana');
select public.cambiar_disponibilidad(true);
select public.ofertar(:'viaje_beto_3', 7000) as oferta_diana_3 \gset
select public.cambiar_modo('estudiante');
reset role;
select prueba.ok((select rol = 'estudiante' and not disponible from public.perfiles where id = :'diana'), 'al pasar a estudiante deja de estar disponible');
select prueba.ok((select estado = 'retirada' from public.ofertas where id = :'oferta_diana_3'), 'y se retiran sus ofertas');
select prueba.ok((select count(*) = 1 from public.vehiculos where conductor_id = :'diana'), 'y conserva su vehículo');
set role authenticated;
select prueba.falla(format('select public.ofertar(%L, 7000)', :'viaje_beto_3'), 'Ponte disponible', 'en modo estudiante no oferta');
select prueba.falla($$select public.cambiar_disponibilidad(true)$$, 'Solo los conductores', 'en modo estudiante no se pone disponible');

-- Con un viaje aceptado como conductora no cambia.
select public.cambiar_modo('conductor');
select public.cambiar_disponibilidad(true);
select public.ofertar(:'viaje_beto_3', 7000) as oferta_diana_4 \gset
select prueba.como(:'beto');
select public.aceptar_oferta(:'oferta_diana_4');
select prueba.falla($$select public.cambiar_modo('conductor')$$, 'Termina o cancela tu viaje', 'el estudiante con viaje aceptado no cambia de modo');
select prueba.como(:'diana');
select prueba.falla($$select public.cambiar_modo('estudiante')$$, 'Termina o cancela tu viaje', 'con un viaje aceptado como conductora no cambia de modo');
reset role;
select prueba.ok((select estado = 'aceptada' from public.ofertas where id = :'oferta_diana_4'), 'el intento fallido no toca la oferta aceptada');
set role authenticated;
select public.cancelar_viaje(:'viaje_beto_3');
select public.cambiar_modo('estudiante');
select prueba.ok((select rol = 'estudiante' from public.perfiles), 'terminado el viaje, ya puede cambiar');

-- Sin sesión o sin rol elegido.
select prueba.como(null);
select prueba.falla($$select public.cambiar_modo('conductor')$$, 'Inicia sesión', 'sin sesión no cambia de modo');

-- Los triggers respaldan el modo aunque alguien llegue a la tabla por otro lado.
reset role;
select prueba.falla(format('insert into public.viajes (estudiante_id, universidad_id, origen_lat, origen_lng, origen_texto, destino_lat, destino_lng, destino_texto) values (%L, 1, 4.1, -73.6, %L, 4.121686, -73.615496, %L)', :'carlos', 'a', 'b'), 'Solo los estudiantes', 'un conductor no queda como estudiante de un viaje');
select prueba.falla(format('insert into public.ofertas (viaje_id, conductor_id, precio) select id, %L, 5000 from public.viajes limit 1', :'ana'), 'Ponte disponible', 'un estudiante no queda como conductor de una oferta');
set role authenticated;

-- ---------------------------------------------------------------------------
-- 8c. Cupos publicados por el conductor (010)
-- ---------------------------------------------------------------------------
\echo '== Cupos'

select prueba.como(:'eva');
select prueba.falla($$select public.publicar_cupo(4.15, -73.64, 'Barzal', now() + interval '1 day', 2, 6000)$$, 'Registra tu vehículo', 'sin vehículo no publica cupo');
insert into public.vehiculos (conductor_id, placa, marca, modelo, color) values (:'eva', 'EVA123', 'Mazda', '2', 'Rojo');
select prueba.falla($$select public.publicar_cupo(4.15, -73.64, 'Barzal', now() + interval '5 minutes', 2, 6000)$$, 'entre 15 minutos y 7 días', 'la salida se publica con anticipación');
select prueba.falla($$select public.publicar_cupo(4.15, -73.64, 'Barzal', now() + interval '8 days', 2, 6000)$$, 'entre 15 minutos y 7 días', 'no más de 7 días adelante');
select prueba.falla($$select public.publicar_cupo(4.15, -73.64, 'Barzal', now() + interval '1 day', 5, 6000)$$, 'de 1 a 4 puestos', 'en carro máximo 4 puestos');
select prueba.falla($$select public.publicar_cupo(4.15, -73.64, 'Barzal', now() + interval '1 day', 2, 500)$$, 'entre $1.000', 'el precio tiene límites');
select prueba.falla($$select public.publicar_cupo(4.15, -73.64, ' ', now() + interval '1 day', 2, 6000)$$, 'Revisa el punto de salida', 'la salida necesita texto');
select public.publicar_cupo(4.15, -73.64, 'Barzal', now() + interval '1 day', 2, 6000) as cupo_eva \gset
reset role;
select prueba.ok((select estado = 'publicado' and destino_lat is not null and destino_texto like 'Universidad Santo Tomás%' from public.cupos where id = :'cupo_eva'), 'el cupo va a la sede, que pone la base');
set role authenticated;
select prueba.falla($$select public.publicar_cupo(4.15, -73.64, 'Barzal', now() + interval '2 days', 2, 6000)$$, 'Ya tienes un cupo', 'un cupo activo a la vez');
select prueba.falla($$select public.cambiar_modo('estudiante')$$, 'cupo antes de cambiar', 'con cupo activo no cambia de modo');
select prueba.falla($$insert into public.cupos (conductor_id, universidad_id, salida_lat, salida_lng, salida_texto, destino_lat, destino_lng, destino_texto, sale_en, puestos, precio) values (auth.uid(), 1, 1, 1, 'a', 2, 2, 'b', now() + interval '1 day', 1, 5000)$$, 'permission denied', 'no se crean cupos a mano');

select prueba.como(:'diana');
select public.cambiar_modo('conductor');
select prueba.falla($$select public.publicar_cupo(4.15, -73.64, 'Barzal', now() + interval '1 day', 2, 6000)$$, 'En moto solo', 'en moto solo 1 puesto');
select prueba.ok((select count(*) = 0 from public.cupos), 'otra conductora no ve cupos ajenos');

select prueba.como(:'carlos');
select prueba.ok((select count(*) = 0 from public.cupos), 'un conductor no ve cupos de otros');

select prueba.como(:'hugo');
select prueba.ok((select count(*) = 0 from public.cupos), 'otra universidad no ve los cupos');

-- Estudiantes piden puesto.
select prueba.como(:'ana');
select prueba.ok((select count(*) = 1 from public.cupos), 'el estudiante ve los cupos publicados de su universidad');
select prueba.ok((select count(*) = 1 from public.vehiculos where conductor_id = :'eva'), 'y el vehículo de quien publica');
select prueba.ok((select count(*) = 0 from public.perfiles where id = :'eva'), 'pero no el teléfono del conductor');
select public.pedir_puesto(:'cupo_eva', 4.14, -73.63, 'Cra 30 #10') as puesto_ana \gset
select prueba.falla(format('select public.pedir_puesto(%L, 4.14, -73.63, %L)', :'cupo_eva', 'x'), 'Ya pediste puesto en este cupo', 'no pide dos veces');
select prueba.falla($$select public.solicitar_viaje(4.15, -73.64, 'X', 4.121686, -73.615496, 'U')$$, 'Ya pediste puesto en un cupo', 'con puesto pedido no pide viaje');
select prueba.falla($$select public.cambiar_modo('conductor')$$, 'cupo antes de cambiar', 'con puesto pedido no cambia de modo');

select prueba.como(:'gabo');
select public.pedir_puesto(:'cupo_eva', 4.13, -73.62, 'Calle 10') as puesto_gabo \gset
select prueba.como(:'beto');
select public.pedir_puesto(:'cupo_eva', 4.13, -73.62, 'Calle 11') as puesto_beto \gset
select prueba.ok((select count(*) = 1 from public.puestos), 'cada estudiante ve solo su solicitud');
select prueba.ok((select libres = 2 from public.puestos_libres(array[:'cupo_eva']::uuid[])), 've cuántos puestos quedan libres');

-- El conductor aprueba hasta llenar los puestos.
select prueba.como(:'eva');
select prueba.ok((select count(*) = 3 from public.puestos), 'el conductor ve las solicitudes de su cupo');
select prueba.falla(format('select public.pedir_puesto(%L, 4.14, -73.63, %L)', :'cupo_eva', 'x'), 'modo estudiante', 'el conductor no pide puesto');
select public.responder_puesto(:'puesto_ana', true);
select public.responder_puesto(:'puesto_gabo', true);
select prueba.falla(format('select public.responder_puesto(%L, true)', :'puesto_beto'), 'Ya no quedan puestos', 'no aprueba más de los puestos ofrecidos');
select public.responder_puesto(:'puesto_beto', false);
select prueba.falla(format('select public.responder_puesto(%L, true)', :'puesto_ana'), 'ya no está pendiente', 'no responde dos veces');
select prueba.ok((select count(*) = 1 from public.perfiles where id = :'ana'), 'el conductor ve el perfil de quien aprobó');
select prueba.ok((select count(*) = 0 from public.perfiles where id = :'beto'), 'pero no el de quien rechazó');
select prueba.ok((select libres = 0 from public.puestos_libres(array[:'cupo_eva']::uuid[])), 'con los puestos llenos quedan 0 libres');
select prueba.como(:'carlos');
select prueba.ok((select count(*) = 0 from public.puestos_libres(array[:'cupo_eva']::uuid[])), 'quien no ve el cupo no ve sus puestos libres');
select prueba.como(:'eva');

select prueba.como(:'beto');
select prueba.falla(format('select public.pedir_puesto(%L, 4.13, -73.62, %L)', :'cupo_eva', 'y'), 'rechazó', 'un rechazado no vuelve a pedir en ese cupo');
select prueba.ok((select count(*) = 1 from public.cupos where id = :'cupo_eva'), 'el rechazado sigue viendo el cupo donde pidió');

select prueba.como(:'carlos');
select prueba.falla(format('select public.responder_puesto(%L, true)', :'puesto_beto'), 'no existe', 'otro conductor no responde solicitudes ajenas');
select prueba.falla(format('select public.cancelar_cupo(%L)', :'cupo_eva'), 'No puedes cancelar', 'otro conductor no cancela el cupo');

select prueba.como(:'ana');
select prueba.ok((select count(*) = 1 from public.perfiles where id = :'eva'), 'aprobada, ve el perfil completo del conductor');
select public.retirar_puesto(:'cupo_eva');
select prueba.ok((select estado = 'retirado' from public.puestos where id = :'puesto_ana'), 'el estudiante retira su puesto');
select public.pedir_puesto(:'cupo_eva', 4.141, -73.631, 'Cra 31') as puesto_ana_otra_vez \gset
select prueba.ok((select estado = 'pendiente' and recogida_texto = 'Cra 31' from public.puestos where id = :'puesto_ana'), 'y puede volver a pedirlo desde otro punto');

-- Salir y llegar (desde 012 hace falta al menos un puesto pagado).
select prueba.como(:'gabo');
select public.pagar_puesto(:'cupo_eva');
select prueba.como(:'eva');
select public.iniciar_cupo(:'cupo_eva');
reset role;
select prueba.ok((select estado = 'en_curso' from public.cupos where id = :'cupo_eva'), 'el conductor inicia el cupo');
select prueba.ok((select estado = 'rechazado' from public.puestos where id = :'puesto_ana'), 'al salir, las solicitudes pendientes quedan rechazadas');
set role authenticated;
select prueba.como(:'gabo');
select prueba.falla(format('select public.retirar_puesto(%L)', :'cupo_eva'), 'No tienes una solicitud activa', 'ya en camino no se retira');
select prueba.como(:'eva');
select public.terminar_cupo(:'cupo_eva');
select prueba.ok((select estado = 'terminado' from public.cupos where id = :'cupo_eva'), 'el conductor termina el cupo');

-- Cancelar un cupo cancela sus puestos.
select public.publicar_cupo(4.15, -73.64, 'Barzal', now() + interval '1 day', 1, 5000) as cupo_eva_2 \gset
select prueba.falla(format('select public.iniciar_cupo(%L)', :'cupo_eva_2'), 'Aún no tienes estudiantes', 'no sale sin estudiantes con el puesto pagado');
select prueba.como(:'ana');
select public.pedir_puesto(:'cupo_eva_2', 4.14, -73.63, 'Cra 30') as puesto_ana_2 \gset
select prueba.como(:'eva');
select public.cancelar_cupo(:'cupo_eva_2');
reset role;
select prueba.ok((select estado = 'cancelado' from public.puestos where id = :'puesto_ana_2'), 'al cancelar el cupo se cancelan los puestos');
set role authenticated;

-- Con un cupo publicado no se oferta en viajes por pedido.
select public.cambiar_disponibilidad(true);
select prueba.como(:'ana');
select public.solicitar_viaje(4.15, -73.64, 'Barrio Centro', 4.121686, -73.615496, 'USTA Villavicencio') as viaje_ana_9 \gset
select prueba.como(:'eva');
select public.publicar_cupo(4.15, -73.64, 'Barzal', now() + interval '1 day', 1, 5000) as cupo_eva_3 \gset
select prueba.falla(format('select public.ofertar(%L, 5000)', :'viaje_ana_9'), 'cupo publicado', 'con cupo publicado no oferta en otros viajes');
select public.cancelar_cupo(:'cupo_eva_3');
select public.ofertar(:'viaje_ana_9', 5000) as oferta_eva_9 \gset
select prueba.falla($$select public.publicar_cupo(4.15, -73.64, 'Barzal', now() + interval '1 day', 1, 5000)$$, 'Retira tus ofertas', 'con ofertas activas no publica cupo');
select prueba.como(:'ana');
select prueba.falla(format('select public.pedir_puesto(%L, 4.14, -73.63, %L)', :'cupo_eva_3', 'x'), 'ya no está disponible', 'no se pide puesto en un cupo cancelado');
select public.cancelar_viaje(:'viaje_ana_9');

select prueba.ok(
  (select count(*) = 2 from pg_publication_tables
   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename in ('cupos', 'puestos')),
  'cupos y puestos están en tiempo real'
);

-- ---------------------------------------------------------------------------
-- 8d. Verificación del conductor (011)
-- ---------------------------------------------------------------------------
\echo '== Verificación del conductor'

reset role;
\set ivan '00000000-0000-0000-0000-0000000000b8'
insert into auth.users (id, email, raw_user_meta_data) values
  (:'ivan', 'ivan@ustavillavo.edu.co', '{"nombre":"Iván Gil","telefono":"+573009998877","rol":"conductor"}');
update public.perfiles set es_admin = true where id = :'gabo';
set role authenticated;

select prueba.como(:'ivan');
insert into public.vehiculos (conductor_id, placa, marca, modelo, color) values (:'ivan', 'IVA321', 'Kia', 'Rio', 'Azul');
select prueba.falla($$select public.cambiar_disponibilidad(true)$$, 'documentos aún no están aprobados', 'sin documentos aprobados no se pone disponible');
select prueba.falla($$select public.publicar_cupo(4.15, -73.64, 'Barzal', now() + interval '1 day', 1, 5000)$$, 'documentos aún no están aprobados', 'sin documentos aprobados no publica cupo');
select prueba.falla(format('select public.enviar_documento(%L, %L, false)', 'cedula', :'ivan' || '/cedula-1.jpg'), 'autorizar', 'sin autorizar el tratamiento de datos no se envía');
select prueba.falla(format('select public.enviar_documento(%L, %L, true)', 'cedula', :'carlos' || '/cedula-1.jpg'), 'no es válido', 'no registra archivos de la carpeta de otro');
select prueba.falla(format('select public.enviar_documento(%L, %L, true)', 'cedula', '../' || :'ivan' || '/x.jpg'), 'no es válido', 'no acepta rutas raras');
select public.enviar_documento('cedula', :'ivan' || '/cedula-1.jpg', true);
select public.enviar_documento('licencia', :'ivan' || '/licencia-1.jpg', true);
select public.enviar_documento('tarjeta_propiedad', :'ivan' || '/tarjeta-1.pdf', true);
select prueba.ok((select count(*) = 3 and bool_and(estado = 'pendiente') and bool_and(autorizado_en is not null) from public.documentos_conductor), 'el conductor ve sus documentos en revisión, con la autorización guardada');
select prueba.falla(format('select public.revisar_documento(id, true) from public.documentos_conductor limit 1'), 'Solo un administrador', 'un conductor no revisa documentos');
select prueba.falla($$update public.perfiles set es_admin = true$$, 'permission denied', 'nadie se vuelve administrador a mano');
select prueba.falla($$update public.documentos_conductor set estado = 'aprobado'$$, 'permission denied', 'no se aprueban documentos a mano');
select prueba.falla($$insert into public.documentos_conductor (conductor_id, tipo, ruta, estado, autorizado_en) values (auth.uid(), 'cedula', 'x/y', 'aprobado', now())$$, 'permission denied', 'no se insertan documentos a mano');

select prueba.como(:'carlos');
select prueba.ok((select count(*) = 3 and bool_and(conductor_id = :'carlos') from public.documentos_conductor), 'otro conductor solo ve los suyos');

select prueba.como(:'ana');
select prueba.ok((select count(*) = 0 from public.documentos_conductor), 'un estudiante no ve documentos');

select prueba.como(:'gabo');
select prueba.ok((select count(*) = 3 from public.documentos_conductor where conductor_id = :'ivan'), 'el administrador ve los documentos');
select prueba.ok((select count(*) = 1 from public.perfiles where id = :'ivan'), 'y el perfil del conductor');
select prueba.ok((select count(*) = 1 from public.vehiculos where conductor_id = :'ivan'), 'y su vehículo, para comparar la placa');
select id as doc_cedula from public.documentos_conductor where conductor_id = :'ivan' and tipo = 'cedula' \gset
select id as doc_licencia from public.documentos_conductor where conductor_id = :'ivan' and tipo = 'licencia' \gset
select id as doc_tarjeta from public.documentos_conductor where conductor_id = :'ivan' and tipo = 'tarjeta_propiedad' \gset
select prueba.falla(format('select public.revisar_documento(%L, false)', :'doc_cedula'), 'motivo', 'rechazar exige un motivo');
select public.revisar_documento(:'doc_cedula', true);
select public.revisar_documento(:'doc_licencia', true);
select public.revisar_documento(:'doc_tarjeta', false, 'La foto está borrosa');
select prueba.falla(format('select public.revisar_documento(%L, true)', :'doc_cedula'), 'ya fue revisado', 'no se revisa dos veces');

select prueba.como(:'ivan');
select prueba.falla($$select public.cambiar_disponibilidad(true)$$, 'no están aprobados', 'con un documento rechazado sigue bloqueado');
select prueba.ok((select motivo = 'La foto está borrosa' from public.documentos_conductor where tipo = 'tarjeta_propiedad'), 've el motivo del rechazo');
select public.enviar_documento('tarjeta_propiedad', :'ivan' || '/tarjeta-2.pdf', true);
select prueba.como(:'gabo');
select public.revisar_documento(:'doc_tarjeta', true);
select prueba.como(:'ivan');
select public.cambiar_disponibilidad(true);
select prueba.ok((select disponible from public.perfiles), 'con los tres aprobados ya se pone disponible');
update public.vehiculos set placa = 'IVA322';
select prueba.ok((select not disponible from public.perfiles), 'al cambiar la placa deja de estar disponible');
select prueba.ok((select estado = 'pendiente' from public.documentos_conductor where tipo = 'tarjeta_propiedad'), 'y la tarjeta de propiedad vuelve a revisión');

reset role;
update public.perfiles set es_admin = true where id = :'ivan';
set role authenticated;
select prueba.como(:'ivan');
select prueba.falla(format('select public.revisar_documento(%L, true)', :'doc_tarjeta'), 'propios', 'nadie revisa sus propios documentos');

-- ---------------------------------------------------------------------------
-- 8e. Billetera, cancelaciones con cobro y strikes (012)
-- ---------------------------------------------------------------------------
\echo '== Billetera y strikes'

reset role;
\set jose '00000000-0000-0000-0000-0000000000c9'
\set kike '00000000-0000-0000-0000-0000000000d1'
insert into auth.users (id, email, raw_user_meta_data) values
  (:'jose', 'jose@ustavillavo.edu.co', '{"nombre":"José Peña","rol":"estudiante"}'),
  (:'kike', 'kike@ustavillavo.edu.co', '{"nombre":"Kike Lara","telefono":"+573001231234","rol":"conductor"}');
insert into public.vehiculos (conductor_id, placa, marca, modelo, color) values (:'kike', 'KIK123', 'Renault', 'Sandero', 'Gris');
insert into public.documentos_conductor (conductor_id, tipo, ruta, estado, autorizado_en)
select :'kike', t.tipo, :'kike' || '/' || t.tipo || '.jpg', 'aprobado', now()
from unnest(enum_range(null::public.tipo_documento)) as t(tipo);
set role authenticated;

-- Recargas
select prueba.como(:'jose');
select prueba.falla($$select public.recargar(1999)$$, 'entre $2.000', 'la recarga mínima es $2.000');
select prueba.falla($$select public.recargar(500001)$$, 'entre $2.000', 'la recarga tiene un máximo');
select public.recargar(20000);
select prueba.ok((select saldo = 20000 from public.billeteras), 'la recarga suma al saldo');
select prueba.ok((select count(*) = 1 and min(monto) = 20000 and min(saldo_despues) = 20000 from public.movimientos), 'y queda en los movimientos');
select prueba.falla($$update public.billeteras set saldo = 999999$$, 'permission denied', 'nadie cambia su saldo a mano');
select prueba.falla($$insert into public.movimientos (persona_id, tipo, monto, saldo_despues, descripcion) values (auth.uid(), 'recarga', 5, 5, 'x')$$, 'permission denied', 'nadie inventa movimientos');

select prueba.como(:'kike');
select public.cambiar_disponibilidad(true);
select prueba.ok((select count(*) = 0 from public.billeteras), 'cada quien ve solo su billetera');

-- A. Pago al aceptar y cobro al terminar
select prueba.como(:'jose');
select public.solicitar_viaje(4.15, -73.64, 'Barrio Porfía', 4.121686, -73.615496, 'USTA') as viaje_a \gset
select prueba.como(:'kike');
select public.ofertar(:'viaje_a', 30000);
select prueba.como(:'jose');
select id as oferta_a from public.ofertas where viaje_id = :'viaje_a' \gset
select prueba.falla(format('select public.aceptar_oferta(%L)', :'oferta_a'), 'Saldo insuficiente', 'sin saldo suficiente no acepta');
select prueba.como(:'kike');
select public.ofertar(:'viaje_a', 8000);
select prueba.como(:'jose');
select public.aceptar_oferta(:'oferta_a');
select prueba.ok((select saldo = 12000 from public.billeteras), 'al aceptar se paga el viaje');
select prueba.ok((select pago_retenido = 8000 from public.viajes where id = :'viaje_a'), 'y el dinero queda retenido en el viaje');
select prueba.como(:'kike');
select public.iniciar_viaje(:'viaje_a');
select public.terminar_viaje(:'viaje_a');
select prueba.ok((select saldo = 7200 from public.billeteras), 'al terminar el conductor recibe el 90 %');
reset role;
select prueba.ok((select sum(monto) = 800 from public.comisiones where viaje_id = :'viaje_a'), 'y UniGo el 10 %');
select prueba.ok((select pago_retenido = 0 from public.viajes where id = :'viaje_a'), 'y el viaje ya no retiene dinero');
set role authenticated;

-- B. El estudiante cancela con el conductor en camino: 20 % y un strike
select prueba.como(:'jose');
select public.solicitar_viaje(4.15, -73.64, 'Barrio Porfía', 4.121686, -73.615496, 'USTA') as viaje_b \gset
select prueba.como(:'kike');
select public.ofertar(:'viaje_b', 5000) as oferta_b \gset
select prueba.como(:'jose');
select public.aceptar_oferta(:'oferta_b');
select public.cancelar_viaje(:'viaje_b');
select prueba.ok((select saldo = 11000 from public.billeteras), 'cancelar con el conductor en camino cuesta el 20 %');
select prueba.ok((select count(*) = 1 from public.strikes where vigente), 'y suma un strike');
select prueba.como(:'kike');
select prueba.ok((select saldo = 8100 from public.billeteras), 'el conductor recibe ese 20 % menos la comisión');

-- C. Cancelar reportando mal comportamiento: sin cobro ni strike
select prueba.como(:'jose');
select public.solicitar_viaje(4.15, -73.64, 'Barrio Porfía', 4.121686, -73.615496, 'USTA') as viaje_c \gset
select prueba.como(:'kike');
select public.ofertar(:'viaje_c', 5000) as oferta_c \gset
select prueba.como(:'jose');
select public.aceptar_oferta(:'oferta_c');
select prueba.falla(format('select public.cancelar_viaje(%L, %L)', :'viaje_c', 'x'), 'Cuéntanos qué pasó', 'el reporte necesita unas palabras');
select public.cancelar_viaje(:'viaje_c', 'Me escribió cosas raras por mensaje');
select prueba.ok((select saldo = 11000 from public.billeteras), 'con reporte se devuelve todo');
select prueba.ok((select count(*) = 1 from public.strikes where vigente), 'y no suma strike');
select prueba.ok((select count(*) = 1 from public.reportes), 'el reporte queda guardado');
select prueba.como(:'kike');
select prueba.ok((select count(*) = 0 from public.reportes), 'el conductor reportado no ve el reporte');
select prueba.como(:'gabo');
select prueba.ok((select count(*) = 1 from public.reportes where viaje_id = :'viaje_c'), 'un administrador sí lo ve');

-- D. El conductor cancela: devolución completa y strike para él
select prueba.como(:'jose');
select public.solicitar_viaje(4.15, -73.64, 'Barrio Porfía', 4.121686, -73.615496, 'USTA') as viaje_d \gset
select prueba.como(:'kike');
select public.ofertar(:'viaje_d', 5000) as oferta_d \gset
select prueba.como(:'jose');
select public.aceptar_oferta(:'oferta_d');
select prueba.como(:'kike');
select public.cancelar_viaje(:'viaje_d');
select prueba.ok((select count(*) = 1 from public.strikes where vigente), 'el conductor que cancela suma un strike');
select prueba.como(:'jose');
select prueba.ok((select saldo = 11000 from public.billeteras), 'y el estudiante recupera todo');

-- F1. Cupo: pagar, dejarlo a tiempo (todo de vuelta) y cancelación del conductor
select prueba.como(:'kike');
select public.publicar_cupo(4.15, -73.64, 'Barzal', now() + interval '1 day', 2, 6000) as cupo_f1 \gset
select prueba.como(:'jose');
select public.pedir_puesto(:'cupo_f1', 4.14, -73.63, 'Cra 30') as puesto_f1 \gset
select prueba.falla(format('select public.pagar_puesto(%L)', :'cupo_f1'), 'puesto aprobado', 'no paga antes de que lo aprueben');
select prueba.como(:'kike');
select public.responder_puesto(:'puesto_f1', true);
select prueba.como(:'jose');
select public.pagar_puesto(:'cupo_f1');
select prueba.ok((select saldo = 5000 from public.billeteras), 'el estudiante paga su puesto');
select prueba.falla(format('select public.pagar_puesto(%L)', :'cupo_f1'), 'Ya pagaste', 'no paga dos veces');
select public.retirar_puesto(:'cupo_f1');
select prueba.ok((select saldo = 11000 from public.billeteras), 'si deja el puesto con tiempo recupera todo');
select prueba.ok((select count(*) = 1 from public.strikes where vigente), 'y no suma strike');
select public.pedir_puesto(:'cupo_f1', 4.14, -73.63, 'Cra 30');
select prueba.como(:'kike');
select public.responder_puesto(:'puesto_f1', true);
select prueba.como(:'jose');
select public.pagar_puesto(:'cupo_f1');
select prueba.como(:'kike');
select public.cancelar_cupo(:'cupo_f1');
select prueba.ok((select count(*) = 2 from public.strikes where vigente), 'cancelar un cupo con puestos pagados suma strike al conductor');
select prueba.como(:'jose');
select prueba.ok((select saldo = 11000 from public.billeteras), 'y los estudiantes recuperan todo');

-- F2. Dejar el puesto a menos de 40 minutos: 30 % y un strike
select prueba.como(:'kike');
select public.publicar_cupo(4.15, -73.64, 'Barzal', now() + interval '30 minutes', 2, 6000) as cupo_f2 \gset
select prueba.como(:'jose');
select public.pedir_puesto(:'cupo_f2', 4.14, -73.63, 'Cra 30') as puesto_f2 \gset
select prueba.como(:'kike');
select public.responder_puesto(:'puesto_f2', true);
select prueba.como(:'jose');
select public.pagar_puesto(:'cupo_f2');
select public.retirar_puesto(:'cupo_f2');
select prueba.ok((select saldo = 9200 from public.billeteras), 'dejar el puesto tarde cuesta el 30 %');
select prueba.ok((select count(*) = 2 from public.strikes where vigente), 'y suma un strike');
select prueba.como(:'kike');
select prueba.ok((select saldo = 9720 from public.billeteras), 'el conductor recibe ese 30 % menos la comisión');
select public.cancelar_cupo(:'cupo_f2');
select prueba.ok((select count(*) = 2 from public.strikes where vigente), 'cancelar un cupo sin pagos no suma strike');

-- F3. Salir con puestos pagados, liberar a quien no pagó y cobrar al llegar
select public.publicar_cupo(4.15, -73.64, 'Barzal', now() + interval '1 day', 2, 6000) as cupo_f3 \gset
select prueba.como(:'jose');
select public.pedir_puesto(:'cupo_f3', 4.14, -73.63, 'Cra 30') as puesto_f3 \gset
select prueba.como(:'gabo');
select public.pedir_puesto(:'cupo_f3', 4.13, -73.62, 'Calle 9') as puesto_gabo_f3 \gset
select prueba.como(:'kike');
select public.responder_puesto(:'puesto_f3', true);
select public.responder_puesto(:'puesto_gabo_f3', true);
select prueba.como(:'jose');
select public.pagar_puesto(:'cupo_f3');
select prueba.como(:'kike');
select public.iniciar_cupo(:'cupo_f3');
reset role;
select prueba.ok((select estado = 'sin_pago' from public.puestos where id = :'puesto_gabo_f3'), 'al salir, quien no pagó pierde el puesto');
set role authenticated;
select public.terminar_cupo(:'cupo_f3');
select prueba.ok((select saldo = 15120 from public.billeteras), 'al llegar el conductor cobra el 90 % de cada puesto pagado');

-- Límite de pago: 10 minutos antes de la salida
select public.publicar_cupo(4.15, -73.64, 'Barzal', now() + interval '1 day', 1, 6000) as cupo_f4 \gset
select prueba.como(:'gabo');
select public.pedir_puesto(:'cupo_f4', 4.13, -73.62, 'Calle 9') as puesto_gabo_f4 \gset
select prueba.como(:'kike');
select public.responder_puesto(:'puesto_gabo_f4', true);
reset role;
update public.cupos set sale_en = now() + interval '5 minutes' where id = :'cupo_f4';
set role authenticated;
select prueba.como(:'gabo');
select prueba.falla(format('select public.pagar_puesto(%L)', :'cupo_f4'), 'límite para pagar', 'no se paga a menos de 10 minutos de la salida');
select prueba.ok((select libres = 1 from public.puestos_libres(array[:'cupo_f4']::uuid[])), 'y el puesto sin pagar ya no cuenta como ocupado');
select prueba.como(:'kike');
select public.cancelar_cupo(:'cupo_f4');

-- E. Tres strikes: suspensión
select prueba.como(:'jose');
select public.solicitar_viaje(4.15, -73.64, 'Barrio Porfía', 4.121686, -73.615496, 'USTA') as viaje_e \gset
select prueba.como(:'kike');
select public.ofertar(:'viaje_e', 3000) as oferta_e \gset
select prueba.como(:'jose');
select public.aceptar_oferta(:'oferta_e');
select public.cancelar_viaje(:'viaje_e');
select prueba.ok((select count(*) = 1 and min(nivel) = 1 and max(hasta - desde) = interval '3 days' from public.suspensiones), 'con 3 strikes queda suspendido 3 días');
select prueba.ok((select count(*) = 0 from public.strikes where vigente), 'y los strikes vuelven a cero');
select prueba.falla($$select public.solicitar_viaje(4.15, -73.64, 'X', 4.121686, -73.615496, 'U')$$, 'suspendida', 'suspendido no pide viajes');
select prueba.falla(format('select public.pedir_puesto(%L, 4.1, -73.6, %L)', :'cupo_f4', 'x'), 'suspendida', 'ni pide puestos');

-- Cada peso cuadra: lo que José recargó = su saldo + lo que ganó Kike + comisiones de sus viajes y puestos.
-- (Sin RLS: José no puede ver el saldo de Kike ni las comisiones.)
reset role;
select prueba.ok((
  select (select sum(monto) from public.movimientos where persona_id = :'jose' and tipo = 'recarga')
       = (select saldo from public.billeteras where persona_id = :'jose')
       + (select saldo from public.billeteras where persona_id = :'kike')
       + (select coalesce(sum(c.monto), 0) from public.comisiones c
          where c.viaje_id in (select id from public.viajes where estudiante_id = :'jose')
             or c.puesto_id in (select id from public.puestos where estudiante_id = :'jose'))
), 'el dinero cuadra: nada se crea ni se pierde');
select prueba.ok((select bool_and(m.saldo_despues = b.saldo) from public.billeteras b
                  join lateral (select saldo_despues from public.movimientos where persona_id = b.persona_id order by creado_en desc, id limit 1) m on true
                  where b.persona_id in (:'jose', :'kike')), 'el último movimiento coincide con el saldo');

-- Suspensiones escalonadas: 3, 7, 15 y 30 días
select privado.dar_strike(:'kike', 'prueba');
select prueba.ok((select max(hasta - desde) = interval '3 days' from public.suspensiones where persona_id = :'kike'), 'primera suspensión: 3 días');
select privado.dar_strike(:'kike', 'prueba'), privado.dar_strike(:'kike', 'prueba'), privado.dar_strike(:'kike', 'prueba');
select prueba.ok((select max(hasta - desde) = interval '7 days' and max(nivel) = 2 from public.suspensiones where persona_id = :'kike'), 'segunda suspensión: 7 días');
select privado.dar_strike(:'kike', 'prueba'), privado.dar_strike(:'kike', 'prueba'), privado.dar_strike(:'kike', 'prueba');
select privado.dar_strike(:'kike', 'prueba'), privado.dar_strike(:'kike', 'prueba'), privado.dar_strike(:'kike', 'prueba');
select privado.dar_strike(:'kike', 'prueba'), privado.dar_strike(:'kike', 'prueba'), privado.dar_strike(:'kike', 'prueba');
select prueba.ok((select array_agg(extract(day from hasta - desde)::int order by nivel) = array[3, 7, 15, 30, 30] from public.suspensiones where persona_id = :'kike'), 'luego 15 y de ahí en adelante 30 días');
select prueba.ok((select not disponible from public.perfiles where id = :'kike'), 'suspendido deja de estar disponible');
set role authenticated;
select prueba.como(:'kike');
select prueba.falla($$select public.cambiar_disponibilidad(true)$$, 'suspendida', 'suspendido no se pone disponible');
select prueba.falla($$select public.publicar_cupo(4.15, -73.64, 'Barzal', now() + interval '1 day', 1, 5000)$$, 'suspendida', 'ni publica cupos');
select prueba.falla($$select privado.dar_strike(auth.uid(), 'x')$$, 'permission denied', 'nadie se pone strikes a mano');

-- ---------------------------------------------------------------------------
-- 8f. Seguimiento en vivo y compartir viaje (013)
-- ---------------------------------------------------------------------------
\echo '== Seguimiento y compartir viaje'

reset role;
\set lia  '00000000-0000-0000-0000-0000000000e7'
\set memo '00000000-0000-0000-0000-0000000000e8'
\set nico '00000000-0000-0000-0000-0000000000e9'
insert into auth.users (id, email, raw_user_meta_data) values
  (:'lia', 'lia@ustavillavo.edu.co', '{"nombre":"Lía Gómez Ruiz","telefono":"+573009998877","rol":"estudiante"}'),
  (:'memo', 'memo@ustavillavo.edu.co', '{"nombre":"Memo Lara","telefono":"+573005556677","rol":"conductor"}'),
  (:'nico', 'nico@ustavillavo.edu.co', '{"nombre":"Nico Paz","rol":"estudiante"}');
insert into public.vehiculos (conductor_id, placa, marca, modelo, color) values (:'memo', 'MEM123', 'Chevrolet', 'Spark', 'Gris');
insert into public.documentos_conductor (conductor_id, tipo, ruta, estado, autorizado_en)
select :'memo', t.tipo, :'memo' || '/' || t.tipo || '.jpg', 'aprobado', now()
from unnest(enum_range(null::public.tipo_documento)) as t(tipo);
set role authenticated;

select prueba.como(:'lia');
select public.recargar(10000);
select public.solicitar_viaje(4.15, -73.64, 'Barzal Alto', 4.121686, -73.615496, 'USTA') as viaje_s \gset
select prueba.falla(format('select public.compartir_viaje(%L)', :'viaje_s'), 'cuando un conductor lo acepte', 'no se comparte un viaje que nadie ha aceptado');
select prueba.como(:'memo');
select public.cambiar_disponibilidad(true);
select prueba.falla(format('select public.reportar_ubicacion(%L, 4.14, -73.63)', :'viaje_s'), 'ya no está activo', 'antes de aceptar no se reporta ubicación');
select public.ofertar(:'viaje_s', 6000) as oferta_s \gset
select prueba.como(:'lia');
select public.aceptar_oferta(:'oferta_s');

-- Ubicación
select prueba.como(:'memo');
select public.reportar_ubicacion(:'viaje_s', 4.14, -73.63, 12);
select prueba.ok((select count(*) = 1 and min(lat) = 4.14 from public.ubicaciones_viaje where viaje_id = :'viaje_s'), 'el conductor reporta su ubicación');
select public.reportar_ubicacion(:'viaje_s', 4.20, -73.70);
select prueba.ok((select lat = 4.14 from public.ubicaciones_viaje where viaje_id = :'viaje_s'), 'si llega antes de 4 segundos se ignora');
reset role;
update public.ubicaciones_viaje set actualizado_en = now() - interval '10 seconds' where viaje_id = :'viaje_s';
set role authenticated;
select public.reportar_ubicacion(:'viaje_s', 4.135, -73.625);
select prueba.ok((select lat = 4.135 and precision_m is null from public.ubicaciones_viaje where viaje_id = :'viaje_s'), 'pasados unos segundos se actualiza');
select prueba.falla(format('select public.reportar_ubicacion(%L, 95, -73.6)', :'viaje_s'), 'no es válida', 'no acepta coordenadas imposibles');
select prueba.falla($$update public.ubicaciones_viaje set lat = 0$$, 'permission denied', 'nadie cambia la ubicación a mano');
select prueba.falla(format('insert into public.ubicaciones_viaje (viaje_id, conductor_id, lat, lng) values (%L, auth.uid(), 1, 1)', :'viaje_s'), 'permission denied', 'ni la inventa');

select prueba.como(:'lia');
select prueba.ok((select count(*) = 1 from public.ubicaciones_viaje where viaje_id = :'viaje_s'), 'el estudiante del viaje ve la ubicación');
select prueba.falla(format('select public.reportar_ubicacion(%L, 4.1, -73.6)', :'viaje_s'), 'ya no está activo', 'el estudiante no reporta ubicación');
select prueba.como(:'nico');
select prueba.ok((select count(*) = 0 from public.ubicaciones_viaje), 'otro estudiante no la ve');
select prueba.como(:'carlos');
select prueba.ok((select count(*) = 0 from public.ubicaciones_viaje), 'otro conductor tampoco');

-- Compartir
select prueba.como(:'memo');
select prueba.falla(format('select public.compartir_viaje(%L)', :'viaje_s'), 'no existe', 'el conductor no crea el enlace');
select prueba.como(:'nico');
select prueba.falla(format('select public.compartir_viaje(%L)', :'viaje_s'), 'no existe', 'otra persona tampoco');
select prueba.como(:'lia');
select public.compartir_viaje(:'viaje_s') as token_s \gset
select prueba.ok(:'token_s' ~ '^[0-9a-f]{64}$', 'el enlace lleva un token largo al azar');
select prueba.ok((select public.compartir_viaje(:'viaje_s') = :'token_s'), 'pedirlo otra vez da el mismo enlace');
select prueba.falla($$select * from public.enlaces_viaje$$, 'permission denied', 'nadie lee la tabla de enlaces');

reset role;
select prueba.como(null);
set role anon;
select prueba.ok((select count(*) = 1 from public.viaje_compartido(:'token_s')
                  where estado = 'aceptado' and estudiante = 'Lía R.' and conductor = 'Memo L.'
                    and vehiculo = 'Chevrolet Spark Gris' and placa = 'MEM123' and ubicacion_lat = 4.135),
                 'sin sesión, el enlace muestra nombres cortos, vehículo y ubicación');
select prueba.ok((select count(*) = 0 from public.viaje_compartido(repeat('a', 64))), 'un token que no existe no muestra nada');
select prueba.ok((select count(*) = 0 from public.viaje_compartido('x'' or true --')), 'ni un token mal formado');
select prueba.falla($$select * from public.ubicaciones_viaje$$, 'permission denied', 'sin sesión no se leen las ubicaciones');
select prueba.falla(format('select public.compartir_viaje(%L)', :'viaje_s'), 'permission denied', 'sin sesión no se crean enlaces');
select prueba.falla(format('select public.reportar_ubicacion(%L, 4.1, -73.6)', :'viaje_s'), 'permission denied', 'ni se reportan ubicaciones');

-- Al terminar: se borra la ubicación y el enlace ya no muestra el viaje
reset role;
set role authenticated;
select prueba.como(:'memo');
select public.iniciar_viaje(:'viaje_s');
select public.reportar_ubicacion(:'viaje_s', 4.13, -73.62);
select public.terminar_viaje(:'viaje_s');
reset role;
select prueba.ok((select count(*) = 0 from public.ubicaciones_viaje where viaje_id = :'viaje_s'), 'al terminar el viaje se borra la ubicación');
select prueba.ok((select count(*) = 1 from public.viaje_compartido(:'token_s') where estado = 'terminado' and conductor is null and placa is null and origen_texto is null),
                 'el enlace de un viaje terminado solo dice que terminó');
set role authenticated;
select prueba.como(:'memo');
select prueba.falla(format('select public.reportar_ubicacion(%L, 4.1, -73.6)', :'viaje_s'), 'ya no está activo', 'después de terminar no se reporta ubicación');
reset role;
select prueba.ok(privado.nombre_corto('  Ana  ') = 'Ana' and privado.nombre_corto('Ana María Rojas') = 'Ana R.' and privado.nombre_corto('') = '',
                 'los nombres cortos se arman como en la app');
select prueba.ok((select count(*) = 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'ubicaciones_viaje'),
                 'la ubicación está en tiempo real');

-- ---------------------------------------------------------------------------
-- 8g. Cupos completos: seguimiento, compartir y calificaciones (014)
-- ---------------------------------------------------------------------------
\echo '== Cupos completos'

set role authenticated;
select prueba.como(:'memo');
select public.publicar_cupo(4.15, -73.64, 'Barzal', now() + interval '1 day', 2, 3000) as cupo_g \gset
select prueba.como(:'lia');
select public.recargar(5000);
select public.pedir_puesto(:'cupo_g', 4.14, -73.63, 'Cra 33 con 41') as puesto_lia \gset
select prueba.como(:'nico');
select public.recargar(5000);
select public.pedir_puesto(:'cupo_g', 4.13, -73.62, 'Parque del Hacha') as puesto_nico \gset
select prueba.como(:'memo');
select public.responder_puesto(:'puesto_lia', true);
select public.responder_puesto(:'puesto_nico', true);

-- Compartir: solo con el puesto pagado
select prueba.como(:'lia');
select prueba.falla(format('select public.compartir_puesto(%L)', :'cupo_g'), 'esté pagado', 'sin pagar no se comparte el cupo');
select public.pagar_puesto(:'cupo_g');
select public.compartir_puesto(:'cupo_g') as token_g \gset
select prueba.ok(:'token_g' ~ '^[0-9a-f]{64}$' and (select public.compartir_puesto(:'cupo_g') = :'token_g'), 'el estudiante con el puesto pagado tiene su enlace, siempre el mismo');
select prueba.como(:'nico');
select public.pagar_puesto(:'cupo_g');
select prueba.ok((select public.compartir_puesto(:'cupo_g') <> :'token_g'), 'cada estudiante tiene su propio enlace');
select prueba.como(:'memo');
select prueba.falla(format('select public.compartir_puesto(%L)', :'cupo_g'), 'No tienes puesto', 'el conductor no comparte con el enlace de un estudiante');
select prueba.falla($$select * from public.enlaces_puesto$$, 'permission denied', 'nadie lee la tabla de enlaces de puestos');

-- Ubicación: solo con el cupo en curso
select prueba.falla(format('select public.reportar_ubicacion_cupo(%L, 4.15, -73.64)', :'cupo_g'), 'no está en camino', 'antes de salir no se reporta ubicación del cupo');
select public.iniciar_cupo(:'cupo_g');
select public.reportar_ubicacion_cupo(:'cupo_g', 4.149, -73.639);
select prueba.ok((select count(*) = 1 from public.ubicaciones_cupo where cupo_id = :'cupo_g'), 'el conductor reporta su ubicación en el cupo');
select public.reportar_ubicacion_cupo(:'cupo_g', 4.0, -73.0);
select prueba.ok((select lat = 4.149 from public.ubicaciones_cupo where cupo_id = :'cupo_g'), 'si llega antes de 4 segundos se ignora');
select prueba.falla(format('select public.reportar_ubicacion_cupo(%L, 4.1, 200)', :'cupo_g'), 'no es válida', 'no acepta coordenadas imposibles');
select prueba.falla($$update public.ubicaciones_cupo set lat = 0$$, 'permission denied', 'nadie cambia la ubicación del cupo a mano');
select prueba.como(:'lia');
select prueba.ok((select count(*) = 1 from public.ubicaciones_cupo where cupo_id = :'cupo_g'), 'el estudiante con puesto pagado ve al conductor');
select prueba.falla(format('select public.reportar_ubicacion_cupo(%L, 4.1, -73.6)', :'cupo_g'), 'no está en camino', 'el estudiante no reporta la ubicación del cupo');
select prueba.como(:'beto');
select prueba.ok((select count(*) = 0 from public.ubicaciones_cupo), 'otro estudiante no la ve');
select prueba.como(:'carlos');
select prueba.ok((select count(*) = 0 from public.ubicaciones_cupo), 'otro conductor tampoco');
select prueba.falla(format('select public.calificar_puesto(%L, 5)', :'puesto_lia'), 'No puedes calificar', 'quien no viajó no califica el puesto');
select prueba.como(:'lia');
select prueba.falla(format('select public.calificar_puesto(%L, 5)', :'puesto_lia'), 'cupos terminados', 'no se califica antes de llegar');

reset role;
select prueba.como(null);
set role anon;
select prueba.ok((select count(*) = 1 from public.cupo_compartido(:'token_g')
                  where estado = 'en_curso' and activo and estudiante = 'Lía R.' and conductor = 'Memo L.'
                    and recogida_texto = 'Cra 33 con 41' and placa = 'MEM123' and ubicacion_lat = 4.149),
                 'sin sesión, el enlace del puesto muestra la recogida de ese estudiante y al conductor en vivo');
select prueba.ok((select count(*) = 0 from public.cupo_compartido(repeat('b', 64))), 'un token de puesto que no existe no muestra nada');
select prueba.falla($$select * from public.ubicaciones_cupo$$, 'permission denied', 'sin sesión no se leen ubicaciones de cupos');
select prueba.falla(format('select public.compartir_puesto(%L)', :'cupo_g'), 'permission denied', 'sin sesión no se crean enlaces de puestos');
select prueba.falla(format('select public.calificar_puesto(%L, 5)', :'puesto_lia'), 'permission denied', 'sin sesión no se califica');

-- Llegar: se borra la ubicación, el enlace se apaga y se califican
reset role;
set role authenticated;
select prueba.como(:'memo');
select public.terminar_cupo(:'cupo_g');
reset role;
select prueba.ok((select count(*) = 0 from public.ubicaciones_cupo where cupo_id = :'cupo_g'), 'al llegar se borra la ubicación del cupo');
select prueba.ok((select count(*) = 1 from public.cupo_compartido(:'token_g') where estado = 'terminado' and not activo and conductor is null and recogida_texto is null),
                 'el enlace de un cupo terminado solo dice que terminó');
set role authenticated;

select prueba.como(:'lia');
select public.calificar_puesto(:'puesto_lia', 5, 'Puntual');
select prueba.ok((select count(*) = 1 from public.calificaciones where puesto_id = :'puesto_lia' and calificado_id = :'memo' and estrellas = 5), 'el estudiante califica al conductor del cupo');
select prueba.falla(format('select public.calificar_puesto(%L, 4)', :'puesto_lia'), 'Ya calificaste', 'solo una vez');
select prueba.falla(format('select public.calificar_puesto(%L, 4)', :'puesto_nico'), 'No puedes calificar', 'no se califica el puesto de otro');
select prueba.falla(format('select public.calificar_puesto(%L, 9)', :'puesto_nico'), 'No puedes calificar', 'ni con estrellas imposibles');
select prueba.como(:'memo');
select public.calificar_puesto(:'puesto_lia', 4);
select public.calificar_puesto(:'puesto_nico', 5);
select prueba.ok((select count(*) = 2 from public.calificaciones where autor_id = :'memo' and puesto_id in (:'puesto_lia', :'puesto_nico')), 'el conductor califica a cada estudiante');
select prueba.falla(format('select public.calificar_puesto(%L, 3, null)', :'puesto_nico'), 'Ya calificaste', 'también una sola vez');
select prueba.falla(format('select public.calificar_puesto(%L, 0)', :'puesto_lia'), 'de 1 a 5', 'las estrellas van de 1 a 5');
select prueba.como(:'lia');
select prueba.ok((select viajes_terminados = 2 and total_calificaciones = 1 from public.perfiles_publicos(array[:'memo'::uuid])),
                 'el perfil del conductor cuenta el cupo terminado y su calificación');
select prueba.ok((select viajes_terminados = 2 from public.perfiles_publicos(array[:'lia'::uuid])),
                 'y el del estudiante también cuenta el cupo');
reset role;
select prueba.ok((select count(*) = 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'ubicaciones_cupo'),
                 'la ubicación del cupo está en tiempo real');

-- ---------------------------------------------------------------------------
-- 10. Intentos de abuso (fase 7: revisión de seguridad)
-- ---------------------------------------------------------------------------
-- Lo que un usuario con sesión podría intentar desde la API de Supabase
-- (PostgREST), saltándose la app. Todo debe fallar o no tener efecto.
\echo '== Intentos de abuso'

reset role;
set role authenticated;
select prueba.como(:'lia');

-- Escalar privilegios en el propio perfil
select prueba.falla($$update public.perfiles set es_admin = true where id = auth.uid()$$, 'permission denied', 'nadie se hace administrador');
select prueba.falla($$update public.perfiles set rol = 'conductor' where id = auth.uid()$$, 'permission denied', 'el rol solo cambia con cambiar_modo');
select prueba.falla($$update public.perfiles set disponible = true where id = auth.uid()$$, 'permission denied', 'la disponibilidad solo cambia con su función');
select prueba.falla($$update public.perfiles set universidad_id = 2 where id = auth.uid()$$, 'permission denied', 'nadie se cambia de universidad');
update public.perfiles set nombre = 'Hackeado' where id = :'memo';
reset role;
select prueba.ok((select nombre = 'Memo Lara' from public.perfiles where id = :'memo'), 'nadie edita el perfil de otro');
set role authenticated;
select prueba.como(:'lia');

-- Saltarse las funciones de la base
select prueba.falla($$insert into public.viajes (estudiante_id, universidad_id, origen_lat, origen_lng, origen_texto, destino_lat, destino_lng, destino_texto) values (auth.uid(), 1, 4.1, -73.6, 'x', 4.1, -73.6, 'y')$$, 'permission denied', 'no se crean viajes sin solicitar_viaje');
select prueba.falla($$update public.viajes set precio = 1$$, 'permission denied', 'no se cambia el precio de un viaje');
select prueba.falla($$update public.viajes set pago_retenido = 0$$, 'permission denied', 'no se toca el dinero retenido');
select prueba.falla($$update public.ofertas set estado = 'aceptada'$$, 'permission denied', 'no se acepta una oferta a mano');
select prueba.falla($$update public.puestos set pagado = 999999$$, 'permission denied', 'no se marca un puesto como pagado');
select prueba.falla($$update public.cupos set precio = 1$$, 'permission denied', 'no se cambia el precio de un cupo');
select prueba.falla(format('insert into public.calificaciones (puesto_id, autor_id, calificado_id, estrellas) select id, auth.uid(), %L, 1 from public.puestos limit 1', :'memo'), 'permission denied', 'no se inventan calificaciones');
select prueba.falla(format('insert into public.strikes (persona_id, motivo) values (%L, %L)', :'memo', 'x'), 'permission denied', 'no se ponen strikes a otros');
select prueba.falla($$delete from public.strikes$$, 'permission denied', 'ni se borran los propios');
select prueba.falla($$select privado.mover_saldo(auth.uid(), 100000, 'recarga', 'x')$$, 'permission denied', 'no se mueve saldo con la función interna');
select prueba.falla($$select privado.pagar_conductor(auth.uid(), 100000, 'x')$$, 'permission denied', 'ni se cobra como conductor');

-- Leer lo ajeno
select prueba.ok((select count(*) = 0 from public.perfiles where id = :'carlos'), 'no se ve el perfil (ni el teléfono) de alguien con quien no se viaja');
select prueba.ok((select count(*) = 0 from public.perfiles_publicos(array[:'hugo'::uuid])), 'no se ven perfiles de otra universidad');
select prueba.ok((select count(*) = 0 from public.comisiones), 'no se ven las comisiones de UniGo');
select prueba.ok((select count(*) = 0 from public.movimientos where persona_id <> auth.uid()), 'no se ven movimientos ajenos');
select prueba.ok((select count(*) = 0 from public.documentos_conductor), 'no se ven documentos de conductores');

-- Documentos y verificación
select prueba.como(:'memo');
select prueba.falla($$update public.documentos_conductor set estado = 'aprobado'$$, 'permission denied', 'el conductor no se aprueba sus documentos');
select prueba.falla(format('select public.revisar_documento(%L, true)', (select id from public.documentos_conductor where conductor_id = :'memo' limit 1)), 'Solo un administrador', 'ni con la función de revisión');
select prueba.falla($$update public.vehiculos set conductor_id = (select id from public.perfiles where id <> auth.uid() limit 1)$$, 'permission denied', 'nadie le pasa su vehículo a otro');
reset role;
select prueba.ok((select count(*) = 3 from public.documentos_conductor where conductor_id = :'memo' and estado = 'aprobado'), 'Memo está verificado antes de cambiar de carro');
set role authenticated;
select prueba.como(:'memo');
delete from public.vehiculos where conductor_id = auth.uid();
insert into public.vehiculos (conductor_id, placa, marca, modelo, color) values (auth.uid(), 'OTR999', 'Mazda', '2', 'Rojo');
reset role;
select prueba.ok((select estado = 'pendiente' from public.documentos_conductor where conductor_id = :'memo' and tipo = 'tarjeta_propiedad'),
                 'borrar el carro y registrar otro manda la tarjeta de propiedad a revisión');
select prueba.ok((select not privado.conductor_verificado(:'memo')), 'y mientras tanto no está verificado');

-- Dinero: nada se crea ni se pierde en toda la base de pruebas. Algunas
-- secciones de arriba ponen saldo inicial a mano (sin movimiento), así que se
-- cuenta con los movimientos: lo que entra por recargas = lo que se movió
-- entre billeteras + lo que cobró UniGo + lo que sigue retenido.
select prueba.ok((
  select (select coalesce(sum(monto), 0) from public.movimientos where tipo = 'recarga')
       = (select coalesce(sum(monto), 0) from public.movimientos)
       + (select coalesce(sum(monto), 0) from public.comisiones)
       + (select coalesce(sum(pago_retenido), 0) from public.viajes)
       + (select coalesce(sum(p.pagado), 0) from public.puestos p join public.cupos c on c.id = p.cupo_id where c.estado <> 'terminado')
), 'el dinero de toda la base cuadra');
select prueba.ok((
  select count(*) = 0 from information_schema.role_table_grants
  where table_schema = 'public' and grantee in ('anon', 'authenticated') and privilege_type in ('TRIGGER', 'REFERENCES', 'TRUNCATE')
), 'nadie desde la API tiene permisos de TRIGGER, REFERENCES ni TRUNCATE');
select prueba.ok((
  select bool_and(p.proconfig @> array['search_path=""'])
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'privado') and p.prosecdef
), 'toda función SECURITY DEFINER fija search_path vacío');
select prueba.ok((
  select bool_and(c.relrowsecurity) from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
), 'todas las tablas tienen RLS activado');

-- ---------------------------------------------------------------------------
-- 11. Política de privacidad (016)
-- ---------------------------------------------------------------------------
\echo '== Política de privacidad'

reset role;
\set olga '00000000-0000-0000-0000-0000000000f1'
insert into auth.users (id, email, raw_user_meta_data) values
  (:'olga', 'olga@ustavillavo.edu.co', '{"nombre":"Olga Ríos","rol":"estudiante","politica":"2026-10-25"}');
select prueba.ok((select politica_version = '2026-10-25' and politica_aceptada_en is not null from public.perfiles where id = :'olga'),
                 'al registrarse queda guardado qué versión de la política aceptó y cuándo');
select prueba.ok((select politica_version is null from public.perfiles where id = :'ana'), 'quien se registró antes no la ha aceptado');

set role authenticated;
select prueba.como(:'ana');
select prueba.falla($$update public.perfiles set politica_version = '2026-10-25' where id = auth.uid()$$, 'permission denied', 'nadie marca la aceptación a mano');
select prueba.falla($$select public.aceptar_politica('cualquier cosa')$$, 'no existe', 'solo se aceptan versiones con fecha');
select public.aceptar_politica('2026-10-25');
reset role;
select prueba.ok((select politica_version = '2026-10-25' and politica_aceptada_en is not null from public.perfiles where id = :'ana'), 'quien ya tenía cuenta la acepta desde la app');
set role anon;
select prueba.falla($$select public.aceptar_politica('2026-10-25')$$, 'permission denied', 'sin sesión no se acepta nada');
reset role;

-- ---------------------------------------------------------------------------
-- 12. Viaje de regreso: de la U a la casa (017)
-- ---------------------------------------------------------------------------
\echo '== Viaje de regreso'

reset role;
\set rita  '00000000-0000-0000-0000-0000000000f2'
\set tomas '00000000-0000-0000-0000-0000000000f3'
insert into auth.users (id, email, raw_user_meta_data) values
  (:'rita', 'rita@ustavillavo.edu.co', '{"nombre":"Rita Gómez","rol":"estudiante","politica":"2026-10-25"}'),
  (:'tomas', 'tomas@ustavillavo.edu.co', '{"nombre":"Tomás León","rol":"conductor","politica":"2026-10-25"}');
insert into public.documentos_conductor (conductor_id, tipo, ruta, estado, autorizado_en)
select :'tomas', t.tipo, :'tomas' || '/' || t.tipo || '.jpg', 'aprobado', now()
from unnest(enum_range(null::public.tipo_documento)) as t(tipo);
insert into public.billeteras (persona_id, saldo) values (:'rita', 200000), (:'tomas', 200000);
insert into public.vehiculos (conductor_id, placa, marca, modelo, color) values (:'tomas', 'TOM123', 'Kia', 'Picanto', 'Rojo');
select prueba.ok((select bool_and(sentido = 'ida') from public.viajes where estudiante_id <> :'rita'), 'los viajes de antes quedan de ida');
select prueba.ok(privado.distancia_km(4.121686, -73.615496, 4.121686, -73.615496) = 0, 'la distancia de un punto a sí mismo es 0');
select prueba.ok(round(privado.distancia_km(4.0, -73.6, 4.1, -73.6)::numeric, 1) = 11.1, 'la distancia en línea recta da lo mismo que en la app (0,1° de latitud ≈ 11,1 km)');

set role authenticated;
select prueba.como(:'rita');
select prueba.falla($$select public.solicitar_viaje(4.15, -73.64, 'Casa', 4.08, -73.58, 'Otro lado')$$, 'debe terminar en la universidad', 'la ida termina en la U');
select prueba.falla($$select public.solicitar_viaje(4.15, -73.64, 'Barzal', 4.14, -73.63, 'Casa', 'regreso')$$, 'máximo 500 m de la sede', 'el regreso sale de la U');
select prueba.falla($$select public.solicitar_viaje(4.121686, -73.615496, 'USTA', 4.1220, -73.6158, 'Al lado', 'regreso')$$, 'menos de 100 m', 'el regreso no termina pegado a la U');
select prueba.falla($$select public.solicitar_viaje(4.121686, -73.615496, 'USTA', 4.15, -73.64, 'Casa', null)$$, 'Elige si vas', 'el sentido es obligatorio');
select public.solicitar_viaje(4.1240, -73.6160, 'USTA Villavicencio (portería de atrás)', 4.15, -73.64, 'Barzal', 'regreso') as viaje_rita \gset
reset role;
select prueba.ok((select sentido = 'regreso' and origen_texto like 'USTA%' and destino_texto = 'Barzal' from public.viajes where id = :'viaje_rita'),
                 'el regreso guarda la recogida cerca de la U y el destino en la casa');
set role authenticated;
select public.cancelar_viaje(:'viaje_rita');

select prueba.como(:'tomas');
select prueba.falla($$select public.publicar_cupo(4.15, -73.64, 'Barzal', now() + interval '1 day', 2, 6000, 'regreso', 4.16, -73.65, 'Lejos')$$, 'sale de la universidad', 'el cupo de regreso sale de la U');
select prueba.falla($$select public.publicar_cupo(4.121686, -73.615496, 'USTA', now() + interval '1 day', 2, 6000, 'regreso')$$, 'hasta dónde vas', 'el cupo de regreso necesita destino');
select prueba.falla($$select public.publicar_cupo(4.121686, -73.615496, 'USTA', now() + interval '1 day', 2, 6000, 'regreso', 4.1218, -73.6156, 'Al lado')$$, 'menos de 100 m', 'el destino no queda pegado a la salida');
select public.publicar_cupo(4.121686, -73.615496, 'USTA Villavicencio', now() + interval '1 day', 2, 6000, 'regreso', 4.15, -73.64, ' Barzal ') as cupo_tomas \gset
select prueba.ok((select sentido = 'regreso' and destino_texto = 'Barzal' and destino_lat = 4.15 from public.cupos where id = :'cupo_tomas'),
                 'el cupo de regreso va hasta donde marcó el conductor');

select prueba.como(:'rita');
select public.pedir_puesto(:'cupo_tomas', 4.14, -73.63, 'Mi casa') as puesto_rita \gset
select prueba.como(:'tomas');
select public.responder_puesto(:'puesto_rita', true);
select prueba.como(:'rita');
select public.pagar_puesto(:'cupo_tomas');
select public.compartir_puesto(:'cupo_tomas') as token_rita \gset
set role anon;
select prueba.ok((select sentido = 'regreso' and recogida_texto = 'USTA Villavicencio' and destino_texto = 'Mi casa'
                  from public.cupo_compartido(:'token_rita')),
                 'el enlace de un cupo de regreso va de la U hasta donde se baja el estudiante');
set role authenticated;
select prueba.como(:'tomas');
select public.cancelar_cupo(:'cupo_tomas');
reset role;

-- ---------------------------------------------------------------------------
-- 9. Sin sesión (anon)
-- ---------------------------------------------------------------------------
\echo '== Sin sesión'
reset role;
select prueba.como(null);
set role anon;

select prueba.ok((select count(*) = 2 from public.universidades), 'sin sesión se ven las universidades');
select prueba.falla($$select * from public.viajes$$, 'permission denied', 'sin sesión no se ven viajes');
select prueba.falla($$select * from public.cupos$$, 'permission denied', 'sin sesión no se ven cupos');
select prueba.falla($$select * from public.perfiles$$, 'permission denied', 'sin sesión no se ven perfiles');
select prueba.falla($$select public.solicitar_viaje(4.1, -73.6, 'a', 4.121686, -73.615496, 'b')$$, 'permission denied', 'sin sesión no se llaman las funciones');
select prueba.falla($$select privado.mi_perfil()$$, 'permission denied', 'sin sesión no se usa el esquema privado');

reset role;
set role authenticated;
select prueba.falla($$select privado.universidad_por_correo('a@ustavillavo.edu.co')$$, 'permission denied', 'las funciones internas del registro no se llaman desde la app');
reset role;

select prueba.ok(
  (select count(*) = 2 from pg_publication_tables
   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename in ('viajes', 'ofertas')),
  'viajes y ofertas están en tiempo real'
);

\echo '== Todas las pruebas pasaron'
