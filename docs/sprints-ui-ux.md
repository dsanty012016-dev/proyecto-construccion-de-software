# Plan de sprints de UI y UX

El equipo autorizó trabajar por sprints a partir de la revisión de 25 mejoras. Se presenta el alcance antes de cambiarlo, se implementa una entrega pequeña, se prueba y se publica mediante Pull Request. Las fechas dependen de la validación y de las decisiones pendientes; no se fijan plazos ficticios.

## Forma de trabajo

1. Explicar al usuario qué se cambiará antes de cada bloque.
2. Trabajar una sola entrega a la vez, en su rama y Pull Request.
3. Comprobar el comportamiento anterior y el nuevo con datos ficticios; conservar las reglas económicas y permisos salvo cambio expresamente aprobado.
4. Pasar lint, pruebas, tipos y compilación; comprobar las pantallas afectadas, teclado y ambos temas.
5. Antes de publicar, resumir los cambios y sus resultados. Después verificar la publicación y registrar el cierre.
6. Pedir la regla concreta cuando falte una decisión operativa. No inventar plazos de atención, responsables de ayuda ni métodos de verificación.

## Entregas

| Sprint | Objetivo | Mejoras | Cierre esperado |
|---|---|---|---|
| 1 · Lectura y accesibilidad | Precios completos, botones que crecen, foco y validación, cabeceras y controles táctiles | U01, U02, U03, U04, U05, U13, U15 | Sin recortes en los estados comprobados a 320/360 px y texto ampliado; errores anunciados, foco reconocible y objetivo táctil de 44 px |
| 2 · Pagos y recuperación | Errores frente a vacíos, recuperación de mapa y compartir, modos de dinero y retorno al puesto tras recargar | U06, U07, U09, U10, U14 | Fallos recuperables sin perder tarea; estado de dinero explícito y retorno al cupo vigente |
| 3 · Registro y preparación | Documentos y primer uso del conductor, corrección de contacto, roles y confirmación de correo | U11, U12, U16, U22, U23 | Cada bloqueo indica un siguiente paso posible; contacto y activación tienen recuperación |
| 4 · Ayuda y confianza | Ayuda en viaje y explicación de faltas | U08, U21 | Canal y responsables definidos; ayuda separada de cancelar y consecuencias explicadas |
| 5 · Historial y administración | Detalle/comprobante, paginación, colas e historial de resoluciones | U17, U18, U19, U20 | Registros antiguos accesibles y revisión administrativa trazable |
| 6 · Acabado y uso frecuente | Fotos de portada y evaluación de lugares/trayectos frecuentes | U24, U25 | Material autorizado o bloques resueltos; atajos validados con estudiantes antes de ampliarlos |

## Sprint 1

**Estado:** publicado mediante [PR #45](https://github.com/dsanty012016-dev/proyecto-construccion-de-software/pull/45), commit `0ebb6bb`. Rama `sprint-1-lectura-accesibilidad`.

- U01: el precio de una oferta y la ganancia se leen completos al ampliar texto.
- U02: los botones principales crecen con etiquetas de varias líneas.
- U03: los campos, incluido el precio, mantienen foco visible aun con errores.
- U04: el foco de disponibilidad contrasta con la tarjeta azul.
- U05: acceso, registro y recuperación anuncian el error y enfocan el campo que debe corregirse.
- U13: saldo, placa y cabeceras se reorganizan sin perder información al ampliar texto.
- U15: disponibilidad tiene una zona activable de al menos 44 px.

Validación realizada: lint, 248 pruebas de reglas, compilación y 236 comprobaciones de navegador con datos ficticios, texto ampliado, dos temas y teclado. La publicación se comprueba mediante el PR y el despliegue. Detalles y límites en [sprint-1-validacion.md](sprint-1-validacion.md). No se ejecutan cobros, transferencias, SQL ni cambios de credenciales en esta entrega.

## Sprint 2

**Estado:** publicado mediante [PR #46](https://github.com/dsanty012016-dev/proyecto-construccion-de-software/pull/46), commit `0d0d10a`. Rama `sprint-2-pagos-recuperacion`.

- U06: las consultas fallidas muestran un error contextual y permiten volver a consultar.
- U07: mapa con reintento y límite de espera; conserva los campos, distingue dirección de punto y permite recuperarse del fallo de GPS.
- U09: simulación interna expresa, Wompi Sandbox, dinero real e indisponibilidad se identifican por separado; el servidor bloquea la simulación fuera del modo autorizado.
- U10: saldo y faltante del puesto visibles; retorno al cupo/viaje desde la recarga, con nueva consulta de estado y plazo y sin pago automático.
- U14: compartir informa fallos y permite reintentar o copiar manualmente el enlace.

305 pruebas y 179 comprobaciones de navegador aprobadas, además de lint y compilación. La verificación visual incluye datos ficticios y el motor real de MapLibre con red controlada. Detalles en [sprint-2-validacion.md](sprint-2-validacion.md). Próxima entrega: sprint 3, registro y preparación.

## Sprint 3

**Estado:** publicado mediante [PR #47](https://github.com/dsanty012016-dev/proyecto-construccion-de-software/pull/47), commit `5a8805d`. Rama `sprint-3-registro-preparacion`.

- U11: documentos enviados/aprobados diferenciados, fecha límite de siete días, rechazo explicado, reemplazo plegado y consulta de estado.
- U12: preparación con siguiente paso posible y acción principal antes del progreso.
- U16: edición del nombre y celular propios; correo institucional fijo en este flujo; guardado mediante RPC con RLS.
- U22: modo inicial reversible, con requisitos de conducción claros.
- U23: reenvío con respuesta neutral, espera de 60 segundos y reinicio efectivo si se escribió mal el correo.

344 pruebas, 118 comprobaciones de navegador y 17 contra Next local aprobadas. La migración 026 pasó las pruebas de base y se aplicó antes de publicar la app. Detalles y límites en [sprint-3-validacion.md](sprint-3-validacion.md).

## Sprint 4

- U08: ayuda separada de cancelar en viajes y cupos activos. El equipo eligió WhatsApp para ayuda de viajes y revisión de faltas.
- U21: acceso a `/perfil/faltas` desde Perfil y Billetera, historial propio con fecha y motivo, y explicación de reglas y suspensiones.

WhatsApp usa la variable de servidor `UNIGO_WHATSAPP_AYUDA`, con el número internacional confirmado por el equipo. Cuando falta una configuración válida, los enlaces se ocultan. Los borradores llevan la referencia del viaje, cupo o falta. El usuario envía el mensaje desde WhatsApp. El responsable del canal revisa las solicitudes en un plazo de 7 días.

Para activar o actualizar el canal, guarda la variable en **Production** en Vercel y vuelve a desplegar. Con una cuenta de UniGo, abre **Perfil → Ayuda de UniGo → Abrir WhatsApp**. Comprueba que el chat sea el del equipo y que se vea el plazo de revisión. Puedes verificar el destino del enlace sin enviar un mensaje. Consulta también **Ayuda con este viaje** desde un viaje activo.

## Sprint 5

- U17: detalle de viajes y cupos con recorrido, fecha, estado y movimientos propios. Billetera enlaza a los recorridos asociados.
- U18: los filtros se aplican sobre el historial de la cuenta antes de paginar. Cada página mezcla viajes y cupos en orden de fecha y conserva filtros y página al volver de un detalle.
- U19: accesos separados con contadores para retiros, incidencias, documentos y reportes. Los plazos de revisión se ven en su cola.
- U20: historial administrativo de retiros con búsqueda por referencia de pago, e incidencias abiertas y cerradas con fecha, responsable y nota de la comparación.

La migración [027](../supabase/migraciones/027-historial-administracion.sql) debe aplicarse después de aprobar las pruebas de base y antes de desplegar la aplicación.

## Sprint 6

- U24: la portada retira los marcos pendientes. Los pasos para conducir y los créditos del equipo aprovechan ese espacio. Las ofertas, salidas y el recibo se identifican como ejemplos.
- U25: [prototipo local](prototipos/uso-frecuente.html) que compara pedir desde cero, usar un lugar frecuente y repetir un trayecto. Las opciones llevan a revisar el recorrido y elegir una oferta nueva, con datos ficticios. La [prueba con estudiantes](prototipos/validar-uso-frecuente.md) queda pendiente antes de integrar los atajos en la app.

## Decisiones que se concretarán en sus sprints

- Sprint 2: la simulación exige activación expresa; Wompi incompleto informa indisponibilidad. La búsqueda de direcciones se conserva como mejora opcional que requiere elegir servicio.
- Sprint 3: confirmado nombre y celular editables, correo institucional fijo en este flujo y revisión de documentos en máximo siete días desde cada envío.
- Sprint 4: WhatsApp confirmado para ayuda y revisión de faltas. El equipo definió el número, la persona responsable y un plazo de revisión de 7 días.
- Sprint 5: cualquier administrador puede cerrar una incidencia después de comparar referencia, transacción, monto, estado de Wompi y movimientos de UniGo. Guarda el resultado de la revisión. El cierre es administrativo y conserva la marca financiera de revisión de la recarga.
- Sprint 6: fotografías propias/autorizadas; validar utilidad de favoritos y repetición antes de construirlos.

## Registro de entregas

Cada cierre debe indicar PR y commit, mejoras resueltas, pruebas realizadas, límites y próxima entrega. Una mejora propuesta no se marca resuelta solo por añadir su texto al plan.

- **18 de noviembre de 2026 · Sprint 1:** U01–U05, U13 y U15 implementadas y verificadas; 248 pruebas y 236 comprobaciones de navegador aprobadas. Se añade la corrección compatible de Next.js 16.4.3 a 16.4.6 necesaria para publicar. PR y commit quedan en el historial de la rama y en el cierre de la entrega. Próxima entrega: sprint 2, pagos y recuperación.
- **18 de noviembre de 2026 · Sprint 2:** U06, U07, U09, U10 y U14 implementadas y verificadas; 305 pruebas, 179 comprobaciones de navegador y 12 comprobaciones visuales adicionales aprobadas. PR, commit y despliegue se registran en el cierre de la entrega. Próxima entrega: sprint 3, registro y preparación.
- **18 de noviembre de 2026 · Sprint 3:** U11, U12, U16, U22 y U23 implementadas y verificadas. Incluye migración 026 de contacto y las reglas de edición/revisión confirmadas por el responsable. PR, aplicación de base y despliegue se registran en el cierre. Próximo: sprint 4, ayuda y confianza.
