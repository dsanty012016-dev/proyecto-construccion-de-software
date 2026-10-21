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
select public.solicitar_viaje(4.142, -73.626, ' Barrio La Esperanza ', 4.08, -73.58, 'USTA Villavicencio') as viaje_ana \gset
select prueba.ok((select estado = 'solicitado' and origen_texto = 'Barrio La Esperanza' from public.viajes where id = :'viaje_ana'), 'el viaje queda solicitado y sin espacios sobrantes');
select prueba.falla($$select public.solicitar_viaje(4.1, -73.6, 'Otra casa', 4.08, -73.58, 'USTA')$$, 'Ya tienes un viaje activo', 'un estudiante no tiene dos viajes activos');
select prueba.falla($$insert into public.viajes (estudiante_id, universidad_id, origen_lat, origen_lng, origen_texto, destino_lat, destino_lng, destino_texto) select id, 1, 1, 1, 'a', 2, 2, 'b' from public.perfiles$$, 'permission denied', 'no se insertan viajes a mano');

select prueba.como(:'beto');
select prueba.falla($$select public.solicitar_viaje(4.1, -73.6, 'Casa', 4.1, -73.6, 'Casa')$$, 'Revisa el origen', 'origen y destino no pueden ser el mismo punto');
select prueba.falla($$select public.solicitar_viaje(95, -73.6, 'Casa', 4.08, -73.58, 'USTA')$$, 'Revisa el origen', 'coordenadas fuera de rango');
select prueba.ok((select count(*) = 0 from public.viajes), 'un estudiante no ve los viajes de otros');
select public.solicitar_viaje(4.15, -73.64, 'Barrio El Buque', 4.08, -73.58, 'USTA Villavicencio') as viaje_beto \gset

select prueba.como(:'carlos');
select prueba.falla($$select public.solicitar_viaje(4.1, -73.6, 'Casa', 4.08, -73.58, 'USTA')$$, 'Solo los estudiantes', 'un conductor no pide viajes');
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
select public.solicitar_viaje(4.15, -73.64, 'Barrio El Buque', 4.08, -73.58, 'USTA Villavicencio') as viaje_beto_2 \gset

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
select prueba.falla($$select public.solicitar_viaje(4.15, -73.64, 'X', 4.08, -73.58, 'U')$$, 'Solo los estudiantes', 'en modo conductor no pide viajes');
select public.cambiar_modo('conductor');
select prueba.ok((select rol = 'conductor' from public.perfiles), 'pedir el mismo modo no hace nada');
select public.cambiar_modo('estudiante');
select prueba.ok((select rol = 'estudiante' from public.perfiles), 'y puede volver a estudiante');
select public.solicitar_viaje(4.15, -73.64, 'Barrio El Buque', 4.08, -73.58, 'USTA Villavicencio') as viaje_beto_3 \gset
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
select prueba.falla(format('insert into public.viajes (estudiante_id, universidad_id, origen_lat, origen_lng, origen_texto, destino_lat, destino_lng, destino_texto) values (%L, 1, 4.1, -73.6, %L, 4.08, -73.58, %L)', :'carlos', 'a', 'b'), 'Solo los estudiantes', 'un conductor no queda como estudiante de un viaje');
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
select prueba.falla($$select public.solicitar_viaje(4.15, -73.64, 'X', 4.08, -73.58, 'U')$$, 'Ya pediste puesto en un cupo', 'con puesto pedido no pide viaje');
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

-- Salir y llegar.
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
select prueba.falla(format('select public.iniciar_cupo(%L)', :'cupo_eva_2'), 'Aún no tienes estudiantes aprobados', 'no sale sin estudiantes aprobados');
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
select public.solicitar_viaje(4.15, -73.64, 'Barrio Centro', 4.08, -73.58, 'USTA Villavicencio') as viaje_ana_9 \gset
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
-- 9. Sin sesión (anon)
-- ---------------------------------------------------------------------------
\echo '== Sin sesión'
reset role;
select prueba.como(null);
set role anon;

select prueba.ok((select count(*) = 2 from public.universidades), 'sin sesión se ven las universidades');
select prueba.falla($$select * from public.viajes$$, 'permission denied', 'sin sesión no se ven viajes');
select prueba.falla($$select * from public.cupos$$, 'permission denied', 'sin sesión no se ven cupos');
select prueba.ok((select count(*) = 0 from public.perfiles), 'sin sesión no se ven perfiles');
select prueba.falla($$select public.solicitar_viaje(4.1, -73.6, 'a', 4.08, -73.58, 'b')$$, 'permission denied', 'sin sesión no se llaman las funciones');
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
