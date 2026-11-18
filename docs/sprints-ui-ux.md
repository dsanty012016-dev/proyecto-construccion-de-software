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

**Estado:** implementado y validado. Rama `sprint-1-lectura-accesibilidad`. El sprint 2 queda pendiente de iniciar tras presentar su bloque de cambios.

- U01: el precio de una oferta y la ganancia se leen completos al ampliar texto.
- U02: los botones principales crecen con etiquetas de varias líneas.
- U03: los campos, incluido el precio, mantienen foco visible aun con errores.
- U04: el foco de disponibilidad contrasta con la tarjeta azul.
- U05: acceso, registro y recuperación anuncian el error y enfocan el campo que debe corregirse.
- U13: saldo, placa y cabeceras se reorganizan sin perder información al ampliar texto.
- U15: disponibilidad tiene una zona activable de al menos 44 px.

Validación realizada: lint, 248 pruebas de reglas, compilación y 236 comprobaciones de navegador con datos ficticios, texto ampliado, dos temas y teclado. La publicación se comprueba mediante el PR y el despliegue. Detalles y límites en [sprint-1-validacion.md](sprint-1-validacion.md). No se ejecutan cobros, transferencias, SQL ni cambios de credenciales en esta entrega.

## Decisiones que se concretarán en sus sprints

- Sprint 2: tratamiento explícito del modo simulado si se espera Wompi y servicio elegido para buscar direcciones, si se incorpora.
- Sprint 3: qué datos de contacto se pueden editar y qué plazo de revisión documental puede cumplir el equipo.
- Sprint 4: canal, responsables y alcance de ayuda; no prometer atención inmediata sin operación real.
- Sprint 5: quién puede resolver una incidencia monetaria y qué comprobaciones exige la conciliación.
- Sprint 6: fotografías propias/autorizadas; validar utilidad de favoritos y repetición antes de construirlos.

## Registro de entregas

Cada cierre debe indicar PR y commit, mejoras resueltas, pruebas realizadas, límites y próxima entrega. Una mejora propuesta no se marca resuelta solo por añadir su texto al plan.

- **18 de noviembre de 2026 · Sprint 1:** U01–U05, U13 y U15 implementadas y verificadas; 248 pruebas y 236 comprobaciones de navegador aprobadas. Se añade la corrección compatible de Next.js 16.4.3 a 16.4.6 necesaria para publicar. PR y commit quedan en el historial de la rama y en el cierre de la entrega. Próxima entrega: sprint 2, pagos y recuperación.
