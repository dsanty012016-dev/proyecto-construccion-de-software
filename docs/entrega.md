# UniGo · Documento de entrega

**Tu viaje, tu universidad.** Proyecto académico de Construcción de Software, Universidad Santo Tomás, seccional Villavicencio.
Equipo: Dilan Santiago Chavarro Parra y David Eduardo Durán Acevedo.
En línea: **https://unigoproject.vercel.app** · Código: este repositorio.

## 1. El problema y la idea
Para ir a la U, muchos estudiantes preguntan en grupos de WhatsApp "¿alguien va pa' la U?" y esperan a que alguien conteste. Otros estudiantes que tienen carro o moto hacen ese camino todos los días con puestos libres.

UniGo los conecta, al estilo de InDrive pero solo entre estudiantes de la misma universidad:
- **Viaje por pedido:** el estudiante marca dónde está, los conductores le ofrecen su precio y él escoge.
- **Cupos con hora fija:** el conductor publica su recorrido (hora, puestos y precio) y los estudiantes piden subirse en un punto del camino.
- **Ida y regreso:** a la U y de la U a la casa.

Solo pueden entrar correos **@ustavillavo.edu.co**. Una misma cuenta se usa como **estudiante** o como **conductor**.

## 2. Qué hace la app
**Estudiante**
- Pide un viaje a la U o de vuelta a casa, eligiendo el punto en el mapa o con su ubicación.
- Recibe ofertas en tiempo real y acepta la que prefiera; paga al aceptar con la billetera.
- Ve al conductor moverse en el mapa (cada 5 s) y puede **compartir su viaje** con un enlace.
- Pide puesto en cupos de ida o de regreso, paga su puesto y ve el orden de recogida.
- Califica al conductor (1 a 5 estrellas) e intercambia teléfono solo durante el viaje.

**Conductor**
- Registra su vehículo y sube cédula, licencia y tarjeta de propiedad; un administrador las aprueba.
- Se pone disponible, ve las solicitudes de su universidad y oferta su precio.
- Publica cupos (ida o regreso); aprueba o rechaza solicitudes; ve las paradas numeradas en orden.
- Transmite su ubicación mientras va en camino y recibe el 90 % del precio al terminar.

**Para todos**
- **Billetera simulada:** recargas de prueba, pagos retenidos hasta terminar el viaje, comisión del 10 %.
- **Cancelaciones, strikes y suspensiones** (ver reglas abajo).
- **Vencimientos:** una solicitud sin oferta aceptada se cancela sola a los 15 minutos; un cupo que no sale se cancela solo 5 minutos después de su hora.
- **Notificaciones en el celular:** nuevas ofertas, aceptaciones, cupos que salen, cancelaciones…
- **App instalable** desde el navegador (Android y iPhone), con pantalla de "sin conexión".
- **Política de privacidad** (Ley 1581) aceptada al registrarse.
- **Administración:** revisión de documentos de conductores.

## 3. Reglas principales
Detalle completo en [`reglas.md`](reglas.md).

| Tema | Regla |
|---|---|
| Precio | Lo pone el conductor (entre $1.000 y $100.000). UniGo cobra 10 % al conductor. |
| Pago | Por pedido: al aceptar la oferta, retenido hasta terminar. Cupo: hasta 10 min antes de salir. |
| Estudiante cancela con el conductor en camino | Se le cobra 20 % y suma 1 strike (salvo que reporte un problema con el conductor). |
| Conductor cancela | Devolución completa al estudiante y 1 strike al conductor. |
| Dejar un puesto de cupo | Con 40 min o más, devolución completa; con menos, se cobra 30 % y 1 strike. |
| Strikes | Con 3, suspensión: 3, 7, 15 y luego 30 días. |
| Regreso | El punto en la U puede estar a máximo 500 m de la sede. |
| Vencimientos | Solicitud: 15 min sin aceptar. Cupo: 5 min después de la hora sin salir (devolución y strike si había pagos). |

## 4. Cómo está construida
**Tecnologías:** Next.js 16 (App Router, Server Actions), React 19, TypeScript estricto, Tailwind CSS 4, Supabase (Postgres, Auth, Realtime, Storage, pg_cron, pg_net y una Edge Function), MapLibre con OpenFreeMap, rutas por las calles con OSRM de FOSSGIS, A-Frame para el 3D de la portada y Vercel para publicar.

```
Celular (PWA) ──► Next.js en Vercel ──► Supabase
  · pantallas        · Server Actions      · Postgres con RLS y funciones RPC (las reglas)
  · mapa             · valida con Zod      · Realtime (ofertas, viajes, ubicación)
  · service worker                         · Storage privado (documentos)
                                           · pg_cron (vencimientos, mantenimiento)
                                           · pg_net ─► Edge Function "enviar-avisos" ─► notificaciones
```

**Decisiones clave**
- **Las reglas viven en la base de datos.** Cada acción (pedir, ofertar, aceptar, pagar, cancelar…) es una función RPC de Postgres que valida todo y cambia los datos en una sola transacción. La pantalla nunca escribe tablas directamente. Así nadie puede saltarse una regla aunque modifique la app.
- **Row Level Security en todas las tablas:** cada quien solo lee lo que le corresponde (el teléfono del otro solo durante el viaje, solo perfiles de su universidad, etc.).
- **Reglas también como funciones puras** en `app/lib/` (sin React, sin reloj ni azar), probadas con Vitest, para la pantalla.
- **Una sola app Next.js** (sitio, app y API). El 3D (A-Frame) solo en la portada pública.

**Organización del código** (detalle en [`AGENTS.md`](../AGENTS.md))
- `app/(sitio)`: portada pública y privacidad. `app/(auth)`: registro, entrar, recuperar contraseña. `app/(app)`: zona privada (estudiante, conductor, viajes, billetera, perfil, administración).
- `app/lib/`: reglas puras, validaciones, Server Actions (`acciones-*.ts`) y consultas.
- `app/ui/`: componentes por zona (`comun`, `auth`, `estudiante`, `conductor`, `sitio`).
- `supabase/migraciones/`: 20 migraciones SQL numeradas (`001` a `020`). `supabase/pruebas/`: pruebas de la base. `supabase/functions/`: la función que envía las notificaciones.

## 5. Seguridad y privacidad
Revisión completa en [`seguridad.md`](seguridad.md).
- Solo correos institucionales (lo bloquea la base, no solo la pantalla).
- RLS en todas las tablas y funciones `SECURITY DEFINER` con `search_path` vacío (hay pruebas automáticas que fallan si alguien olvida alguna).
- Documentos de conductores en almacenamiento privado, con enlaces que vencen en 5 minutos.
- Ubicación en vivo solo del conductor, solo durante el viaje, y se borra al terminar.
- Política de seguridad del navegador (CSP), cabeceras de seguridad, protección contra redirecciones abiertas.
- Revisión de dependencias (`npm audit`) en cada subida: ya obligó a actualizar Next.js, MapLibre y Zod por fallas críticas.
- Ley 1581: política en `/privacidad`, aceptación guardada con versión y fecha ([`supabase-auth.md`](supabase-auth.md), [`notificaciones.md`](notificaciones.md)).

## 6. Calidad y pruebas
- **123 pruebas de las reglas** en TypeScript (Vitest): viaje, cupos, pagos, ida y regreso, vencimientos, validaciones, mapa…
- **384 comprobaciones de la base de datos** (`supabase/pruebas/pruebas.sql`): cada regla, cada permiso y unos 30 intentos de abuso (escalar privilegios, leer datos ajenos, mover dinero, saltarse funciones).
- **GitHub Actions en cada subida:** lint, pruebas, build con revisión de tipos, auditoría de dependencias y todas las migraciones más sus pruebas en un Postgres limpio.
- **Trabajo por ramas y Pull Requests** a `main`; Vercel publica cada merge.

## 7. Estado y pendientes
**Listo y en línea:** todo lo de la sección 2.

**Pendiente o futuro**
- Pasarela de pago real (Wompi, Mercado Pago o ePayco): la billetera hoy es simulada.
- Optimizar el orden de las paradas con rutas reales ("IA para la mejor ruta"), si se requiere.
- Inicio de sesión con la cuenta Microsoft de la universidad (necesita autorización de la USTA).
- Borrar documentos viejos de conductores y avisar el vencimiento de la licencia.
- Publicar en Play Store y App Store (hoy se instala desde el navegador, sin costo).

## 8. Cómo probarla
1. Abrir **https://unigoproject.vercel.app** en el celular y crear una cuenta con un correo @ustavillavo.edu.co.
2. Confirmar la cuenta desde el correo y aceptar la política.
3. Instalarla ("Instalar UniGo" o, en iPhone, Compartir → Agregar a inicio) y activar las notificaciones.
4. Con una segunda cuenta en modo conductor (vehículo registrado y documentos aprobados por un administrador), ponerse disponible, ofertar en la solicitud y seguir el viaje hasta calificar.

Para correrla en un computador, ver el [`README`](../README.md).
