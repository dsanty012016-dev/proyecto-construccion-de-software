-- Pruebas de 026 en la base simulada; nunca se ejecutan contra el proyecto real.
reset role;
select gen_random_uuid() as contacto_uno, gen_random_uuid() as contacto_otro \gset
insert into auth.users (id, email, raw_user_meta_data) values
  (:'contacto_uno', 'contacto-uno@ustavillavo.edu.co', '{"nombre":"Contacto Uno","rol":"estudiante"}'),
  (:'contacto_otro', 'contacto-otro@ustavillavo.edu.co', '{"nombre":"Contacto Otro","rol":"conductor","telefono":"+573001112233"}');
select universidad_id as contacto_universidad from public.perfiles where id = :'contacto_uno' \gset
set role authenticated;
select prueba.como(:'contacto_uno');
select public.actualizar_contacto('  Nombre corregido  ', '+573009998877');
select prueba.ok((select nombre = 'Nombre corregido' and telefono = '+573009998877' from public.perfiles where id = :'contacto_uno'), 'el dueño actualiza nombre y celular con espacios normalizados');
select prueba.ok((select rol = 'estudiante' and not es_admin and universidad_id = :'contacto_universidad'::smallint from public.perfiles where id = :'contacto_uno'), 'guardar contacto conserva rol, universidad y permisos');
select prueba.falla($$select public.actualizar_contacto(' ', '+573009998877')$$, 'nombre', 'rechaza un nombre vacío');
select prueba.falla($$select public.actualizar_contacto(repeat('a',81), '+573009998877')$$, 'nombre', 'rechaza un nombre demasiado largo');
select prueba.falla($$select public.actualizar_contacto(null, '+573009998877')$$, 'nombre', 'rechaza nombre nulo');
select prueba.falla($$select public.actualizar_contacto('Nombre', '+572009998877')$$, 'celular', 'rechaza un celular que no empieza por tres');
select prueba.falla($$select public.actualizar_contacto('Nombre', null)$$, 'celular', 'rechaza celular nulo');
select prueba.falla($$select public.actualizar_contacto('Nombre', '3009998877')$$, 'celular', 'la RPC exige el formato internacional normalizado');
select prueba.como(gen_random_uuid());
select prueba.falla($$select public.actualizar_contacto('Nombre', '+573009998877')$$, 'perfil', 'no anuncia éxito si la cuenta no tiene perfil');
select prueba.como(null);
select prueba.falla($$select public.actualizar_contacto('Nombre', '+573009998877')$$, 'sesión', 'rechaza una llamada autenticada sin identidad');
reset role;
set role anon;
select prueba.falla($$select public.actualizar_contacto('Nombre', '+573009998877')$$, 'permission denied', 'una sesión anónima no puede editar contacto');
reset role;
select prueba.ok((select nombre = 'Contacto Otro' and telefono = '+573001112233' from public.perfiles where id = :'contacto_otro'), 'guardar contacto no modifica otra cuenta');
select prueba.ok((select email = 'contacto-uno@ustavillavo.edu.co' from auth.users where id = :'contacto_uno'), 'guardar contacto conserva el correo institucional');
select prueba.ok((select not prosecdef from pg_proc where oid = 'public.actualizar_contacto(text,text)'::regprocedure), 'la RPC usa RLS y permisos del usuario sin elevar privilegios');
