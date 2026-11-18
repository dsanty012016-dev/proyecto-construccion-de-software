# Sprint 3 · Registro y preparación

Entrega basada en `0d0d10a14f28430bf5715538884c10f1ea95fd2d` (sprint 2, PR #46). Aplica U11, U12, U16, U22 y U23 del [plan](sprints-ui-ux.md).

Reglas confirmadas por el responsable del proyecto: nombre y celular editables; correo institucional fijo en este flujo; plazo máximo de revisión documental de siete días desde cada envío.

## Comportamiento

- **Documentos:** enviados y aprobados se cuentan por separado. Cada documento muestra estado y fecha de envío; un pendiente muestra su fecha límite y avisa si venció. El reemplazo pendiente comienza plegado, una corrección rechazada se abre con su motivo y los aprobados se conservan. Se puede consultar el estado sin reenviar. Un fallo de subida vuelve a habilitar el botón.
- **Preparación del conductor:** vehículo, envío de documentos, revisión y disponibilidad forman una secuencia. Se adelanta el siguiente paso posible. Esperar revisión no pide activar un interruptor deshabilitado. Aprobar documentos sin tener vehículo tampoco anuncia que ya se puede conducir. Las reglas de verificación de la base continúan vigentes.
- **Contacto:** Perfil permite corregir nombre y celular, conserva lo escrito ante errores y confirma el guardado. El servidor valida los valores y llama a `actualizar_contacto`, sin aceptar ID, correo, rol ni permisos como campos editables. La RPC usa la identidad de la sesión, RLS y permisos existentes; no eleva privilegios y rechaza una actualización sin perfil.
- **Modo de uso:** el registro pregunta cómo empezar y explica que se puede cambiar desde Perfil con la misma cuenta. Conducir anticipa vehículo y documentos, además del plazo de revisión. La protección existente contra cambiar de modo con un viaje activo se conserva.
- **Confirmación del correo:** el registro conserva el correo para solicitar otro enlace; entrar y los enlaces vencidos ofrecen acceso a `/confirmar-correo`. Reenviar no llama a registro ni crea otra cuenta. La respuesta es la misma para cuentas pendientes, desconocidas, confirmadas o limitadas por el proveedor. Un fallo de transporte permite recuperarse. La espera de interfaz es de 60 segundos, también tras registrarse, y usa un reloj monotónico para no depender de la fecha del celular. Supabase conserva sus propios límites de envío en el servidor.

Para un correo escrito incorrectamente se ofrece volver al registro y usar el correcto. Se usa navegación completa para que esa acción reinicie el formulario incluso al venir del propio registro. No se cambia el correo de una cuenta ajena ni se afirma que una cuenta desconocida exista.

## Comprobaciones

- Lint y compilación de producción, con TypeScript: aprobados.
- 344 pruebas automáticas aprobadas en 36 archivos, incluidas 39 nuevas sobre preparación, fechas, contacto, recuperación y privacidad del reenvío.
- 118 comprobaciones de navegador aprobadas: 320/360 px, ambos temas, texto ampliado, pendientes/rechazados/atrasados, corrección de datos, errores de subida, cambio de modo bloqueado, espera del correo y reinicio del registro. Incluye un reloj de celular atrasado.
- 17 comprobaciones adicionales aprobadas contra el servidor Next real local, incluidas la nueva ruta pública, protección de páginas privadas y validación antes de escribir.
- Se añaden pruebas SQL de propiedad, campos protegidos, valores inválidos, sesiones sin identidad y permisos de la nueva RPC para ejecutarlas en la base aislada de GitHub.

Las páginas privadas y las acciones válidas se prueban con datos y proveedores ficticios. No se envían correos reales, se suben documentos personales ni se cambian perfiles reales para probar. La entrega de un nuevo correo real y el uso con lector de pantalla quedan pendientes de una sesión autorizada con el equipo.

## Publicación de la base y la app

La migración [026-perfil-contacto.sql](../supabase/migraciones/026-perfil-contacto.sql) se creó con el generador oficial y se ajustó a la numeración del repositorio. Añade únicamente la RPC de contacto; aprovecha RLS y permisos de columnas ya presentes. No cambia registros ni la aprobación documental. Las pruebas aisladas están en [perfil-contacto.sql](../supabase/pruebas/perfil-contacto.sql).

Mostrar el archivo antes de aplicarlo al proyecto conectado; comprobar la última migración y las columnas existentes. Después de pasar CI, aplicar la migración antes de publicar la app que la utiliza, comprobar sus permisos y contrastar el tipo generado. Registrar PR, commit y despliegue en el cierre. No ejecutar las pruebas ficticias contra la base real.

Referencia del reenvío y sus límites: [Supabase Auth resend](https://supabase.com/docs/reference/javascript/auth-resend) y [límites de Auth](https://supabase.com/docs/guides/auth/rate-limits). La cuenta atrás de interfaz no sustituye esos límites del proveedor.
