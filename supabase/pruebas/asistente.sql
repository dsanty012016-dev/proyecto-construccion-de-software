-- Pruebas de 034 (cupo diario del asistente) en la base simulada; nunca contra el proyecto real.
reset role;
select gen_random_uuid() as uni_persona \gset
insert into auth.users (id, email, raw_user_meta_data) values
  (:'uni_persona', 'uni-persona@ustavillavo.edu.co', '{"nombre":"Persona Uni","rol":"estudiante"}');
set role authenticated;
select prueba.como(:'uni_persona');
select prueba.ok((select public.usar_asistente()), 'el primer mensaje del día está permitido');
select public.usar_asistente() from generate_series(2, 40);
select prueba.ok((select public.usar_asistente() = false), 'el mensaje 41 del día ya no usa la IA');
select prueba.falla($$select * from public.asistente_uso$$, 'permission denied', 'nadie lee el conteo directo');
select prueba.como(null);
select prueba.ok((select public.usar_asistente() = false), 'sin identidad no hay cupo');
reset role;
select prueba.ok((select mensajes = 41 from public.asistente_uso where usuario_id = :'uni_persona'), 'el conteo es de la persona y del día');
set role anon;
select prueba.falla($$select public.usar_asistente()$$, 'permission denied', 'una sesión anónima no puede usar el asistente');
reset role;
