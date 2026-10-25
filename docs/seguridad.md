# Revisión de seguridad (fase 7)

Revisión final de la base de datos y de la app, hecha el 25 de octubre de 2026 sobre `main` (migraciones 001 a 014). Los ataques se hicieron sobre una copia local de la base con las mismas migraciones, nunca contra el Supabase real. Contra Supabase solo se usó su revisor (lectura).

## Resultado

| # | Hallazgo | Gravedad | Estado |
|---|---|---|---|
| 1 | Un conductor verificado podía **borrar su vehículo y registrar otro** sin que le revisaran la tarjeta de propiedad del carro nuevo (cambiar la placa sí la mandaba a revisión). | Alta: conductor sin verificar llevando estudiantes. | Corregido en `015-revision-seguridad.sql`, con prueba. |
| 2 | **Redirección a otro sitio** después de iniciar sesión: `destinoSeguro` dejaba pasar `/<tab>/sitio-malo.com`; el navegador borra el tab y termina en `//sitio-malo.com`. Servía para mandar un enlace "de UniGo" que lleve a una página falsa. | Media | Corregido en `app/lib/rutas.ts`, con pruebas. |
| 3 | La app no enviaba **cabeceras de seguridad** (se podía meter en un iframe, sin `nosniff`, sin política de permisos). | Media | Corregido en `next.config.ts`. |
| 4 | Permisos `TRIGGER`, `REFERENCES` y `TRUNCATE` para `anon` y `authenticated` en casi todas las tablas (Supabase los da por defecto). Desde la API no se pueden usar. | Baja (defensa en profundidad) | Quitados en `015`. |
| 5 | `anon` tenía permiso de leer `perfiles` (RLS no devolvía filas). | Baja | Quitado en `015`. |

## Lo que se comprobó y aguanta

Todo esto quedó como prueba en `supabase/pruebas/pruebas.sql` (sección 10) y corre en GitHub en cada subida (318 comprobaciones en total).

- **RLS en todas las tablas** y toda función `SECURITY DEFINER` con `search_path` vacío (prueba automática: si alguien agrega una tabla sin RLS o una función sin `search_path`, falla).
- **Escalar privilegios:** nadie se hace administrador, ni cambia su rol, disponibilidad o universidad a mano; nadie edita el perfil de otro.
- **Saltarse las funciones:** no se pueden crear viajes ni ofertas, ni cambiar precios, estados, pagos retenidos, puestos pagados, strikes ni calificaciones directamente.
- **Dinero:** las funciones internas (`mover_saldo`, `pagar_conductor`, `dar_strike`) no se pueden llamar desde la API; en toda la base de pruebas lo recargado = lo movido + comisiones + lo retenido.
- **Leer lo ajeno:** teléfonos solo de la otra persona del viaje activo; perfiles solo de la misma universidad; comisiones solo administradores; movimientos y documentos solo los propios.
- **Verificación:** el conductor no se aprueba sus documentos (ni con la tabla ni con `revisar_documento`); los archivos solo van a su carpeta (restricción `ruta_en_su_carpeta` y política de Storage).
- **Seguimiento y enlaces compartidos** (013, 014): ubicación solo para quien va en el viaje o cupo, se borra al cerrar; tokens de 64 caracteres al azar; sin sesión solo se ve lo mínimo y nunca teléfonos.
- **App:** no hay claves secretas en el código (solo la URL y la clave publicable de Supabase); toda Server Action valida con Zod antes de llamar a la base; los dos `innerHTML` del código arman HTML con datos fijos, no con texto de usuarios; Next.js 16.3.8 y React 19.2.8 ya incluyen los parches de los avisos críticos de agosto y septiembre de 2026.

## Lo que queda (no es código)

1. **Activar la protección de contraseñas filtradas** en Supabase (Authentication → Policies). Es el único aviso de seguridad del revisor que no es intencional.
2. **Aplicar `015-revision-seguridad.sql`** en Supabase.
3. **Política de privacidad** (Ley 1581): la app guarda documentos de conductores y la ubicación durante los viajes.
4. Al publicar en Vercel: revisar en el panel de Supabase que **Site URL** y **Redirect URLs** sean solo el dominio de UniGo, y correr `npm audit`.
5. Más adelante, una **CSP completa**: hoy solo se bloquea meter la app en un iframe, porque el mapa y el 3D cargan de varios dominios y hay que probarla en Vercel.

## Decisiones de diseño (conocidas, no son fallas)

- Los conductores disponibles ven la recogida exacta de las solicitudes de su universidad: la necesitan para ofertar.
- Los administradores ven los perfiles (con teléfono) de todos para revisar conductores.
- Las funciones de la API se pueden llamar con sesión: son las que hacen cumplir las reglas (el revisor de Supabase las marca como aviso, a propósito).
