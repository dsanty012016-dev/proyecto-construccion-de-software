# Reglas del viaje

Las reglas viven en dos lugares que deben coincidir:
- `app/lib/viaje.ts`: funciones puras para la pantalla, probadas con `npm test`.
- `supabase/migraciones/004-viajes.sql`: funciones RPC que de verdad las hacen cumplir, probadas con `supabase/pruebas/`.

Si cambias una regla, cámbiala en los dos y en sus pruebas.

## Decidido por el equipo
- **Ciudad:** Villavicencio, Colombia.
- **Universidad:** por ahora solo la **Universidad Santo Tomás, seccional Villavicencio**. El modelo admite más universidades (tabla `universidades`), y nadie ve viajes ni perfiles de otra universidad.
- **Correo:** solo se registran correos **@ustavillavo.edu.co**. Lo bloquea la base de datos (trigger al crear la cuenta), tanto con contraseña como con Google, y también al cambiar el correo.
- **Conductor:** también es estudiante de la universidad (mismo filtro de correo). Debe registrar su vehículo (placa colombiana) para ponerse disponible.
- **Roles:** cada cuenta es **estudiante** o **conductor**. Se elige al registrarse; quien entra con Google lo elige después, una sola vez.
- **Precio:** lo pone el **conductor**. Los conductores disponibles ofertan su precio en una solicitud y el estudiante escoge una oferta (como InDrive). Límite técnico entre $1.000 y $100.000 para atajar errores de digitación (no es una tarifa).
- **Viajes:** de **una sola persona** (un estudiante por viaje).
- **Pagos:** solo **digitales**, sin efectivo. Por ahora una **billetera simulada** (saldo y recargas de prueba); la pasarela real (Wompi, Mercado Pago o ePayco) llega después sin cambiar la lógica.
- **Comisión:** UniGo cobra el **10 % del precio de la oferta al conductor**. El estudiante paga el precio ofertado; el conductor recibe el 90 % (oferta de $6.500 → recibe $5.850).
- **Teléfono:** estudiante y conductor se ven el celular solo mientras el viaje está aceptado o en curso.
- **Compartir viaje:** el estudiante podrá enviar un enlace para seguir su viaje; se hace en la fase 4 (necesita ubicación en tiempo real).

- **Recogida:** el estudiante elige el punto en el mapa (o con la ubicación del celular). No puede ser la misma universidad (menos de 100 m se rechaza en pantalla; la base rechaza el mismo punto exacto).

## Cómo funciona un viaje
```
solicitado ──(el estudiante acepta una oferta)──▶ aceptado ──(recoge)──▶ en_curso ──(llega)──▶ terminado
     └──────────────(cancelar)──────────────┴──▶ cancelado
```
- **solicitado:** el estudiante pidió el viaje. Si tiene ofertas activas, la pantalla dice "Con ofertas".
- Un conductor tiene **una oferta por viaje**; si vuelve a ofertar se actualiza el precio. Puede retirarla.
- Al aceptar una oferta, las demás del viaje quedan rechazadas, y las ofertas de ese conductor en **otros** viajes se retiran (solo lleva un viaje a la vez).
- **aceptado** ("Conductor en camino"): cada uno ve el perfil completo del otro, con teléfono, hasta que el viaje termina.
- Solo el conductor asignado inicia (**en_curso**) y termina (**terminado**) el viaje.
- Un estudiante tiene a lo sumo **un viaje activo**; un conductor, a lo sumo **uno aceptado o en curso**.
- Si el conductor deja de estar disponible o borra su vehículo, sus ofertas activas se retiran.
- **Calificación:** al terminar, cada uno califica al otro una vez (1 a 5 estrellas, comentario opcional de hasta 300 caracteres).

## Cupos publicados por el conductor (fase 4c, migración 010)
La otra forma de viajar: el conductor publica su recorrido y los estudiantes piden subirse en un punto del camino.

**Decidido por el equipo**
- El conductor publica un **cupo**: punto de salida, **hora de salida**, **número de puestos** y **precio fijo por puesto**. El destino es la universidad.
- Un estudiante pide subirse indicando su **punto de recogida** en el mapa. El **conductor aprueba o rechaza** cada solicitud (ve qué tan lejos queda de su ruta).
- Cada estudiante aprobado ocupa un puesto y paga el precio del puesto; la comisión del 10 % se le descuenta al conductor por cada estudiante.
- Esto **cambia** la regla anterior de "viajes de una persona": en un cupo pueden ir varios estudiantes.

- **Hora definida con anticipación:** el cupo siempre se publica con su hora de salida (no hay cupos "para ya").
- **Pago:** se hace a más tardar **10 minutos antes** de la hora de salida. Quien no haya pagado para entonces pierde el puesto (cómo se libera el puesto queda por definir en la fase de pagos).

**Provisional (propuesto, falta confirmar; así quedó construido)**
- Puestos: moto 1 (la placa ABC12D lo dice); carro de 1 a 4.
- Hora de salida: entre **15 minutos** y 7 días desde ahora (los 15 minutos dejan margen para el pago 10 minutos antes). Las solicitudes se cierran a la hora de salida.
- Un conductor tiene un cupo activo a la vez; con un cupo publicado no oferta en viajes por pedido, y para publicar no puede tener ofertas activas.
- El conductor solo puede salir si tiene al menos un estudiante aprobado; al salir, las solicitudes pendientes quedan rechazadas.
- Un estudiante rechazado no vuelve a pedir en ese mismo cupo; si retiró su solicitud, sí puede volver a pedirla.
- El teléfono del otro se ve solo con el puesto aprobado y el cupo activo.
- Nadie tiene a la vez un viaje pedido activo y un puesto aprobado en un cupo.
- Cancelar: el estudiante puede retirar su solicitud o su puesto antes de que el cupo salga; si el conductor cancela el cupo, se cancelan todos los puestos. Sin penalización (igual que hoy).
- No hay límite fijo de desvío: el conductor decide al aprobar, viendo la distancia aproximada (en línea recta) de cada recogida a su camino.

**Pendiente para otras fases:** calificar los cupos y verlos en el historial; el pago (fase 4b).

## Cambio de modo (fase 4d)
- Una misma cuenta usa la app **como estudiante o como conductor** y puede cambiar cuando quiera (botón en Inicio y en Perfil). `perfiles.rol` es el **modo actual**; `elegir_rol` solo sirve la primera vez.
- **No se cambia de modo con un viaje en marcha:** como estudiante (pedido, aceptado o en curso) ni como conductor (aceptado o en curso).
- Al cambiar, deja de estar disponible y se retiran sus ofertas activas. El vehículo se conserva.
- En modo conductor se registra el vehículo; para ponerse disponible y ofertar sigue haciendo falta tenerlo.
- Lo hace cumplir `cambiar_modo` (009-cambio-de-modo.sql), con triggers de respaldo al pedir viajes y al ofertar.

## Verificación del conductor (fase 4e, migración 011)
**Decidido por el equipo**
- Para conducir hay que subir **cédula**, **licencia de conducción** y **tarjeta de propiedad** del vehículo.
- Los revisa **a mano un administrador** (David y Dilan). Nadie revisa sus propios documentos.
- **Hasta que los tres estén aprobados**, el conductor no puede ponerse disponible, ofertar ni publicar cupos.

**Cómo quedó construido**
- Los archivos van a un almacenamiento **privado** de Supabase: solo los ven su dueño y los administradores, con enlaces que vencen en 5 minutos.
- Al subirlos, el conductor **autoriza el tratamiento de sus datos** (Ley 1581 de 2012); queda la fecha.
- Si un documento se rechaza (con motivo) o se vuelve a subir, el conductor deja de estar disponible hasta que lo aprueben otra vez. Si cambia la placa, la tarjeta de propiedad vuelve a revisión.
- Pendiente: política de privacidad escrita, borrar archivos viejos y vencimiento de la licencia.

## Billetera, cancelaciones y strikes (fase 4b, migración 012)
**Decidido por el equipo**
- Billetera **simulada** (pasarela real después). Recargas con monto libre desde **$2.000**.
- **Viaje por pedido:** el estudiante paga **al aceptar la oferta** (sin saldo no puede aceptar). El pago queda **retenido** y al terminar el viaje el conductor recibe el 90 % y UniGo el 10 %.
- **Estudiante cancela con el conductor en camino:** se le cobra el **20 %** (el conductor recibe ese 20 % menos la comisión) y suma **1 strike**. Más adelante el cobro dependerá de cuánto avanzó el conductor (necesita el seguimiento en vivo). **Excepción:** si cancela reportando mal comportamiento o algo raro del conductor, no paga ni recibe strike; el reporte llega a los administradores.
- **Conductor cancela un viaje aceptado:** devolución completa al estudiante y **1 strike** al conductor.
- **Viaje en curso:** no se puede cancelar (por ahora).
- **Cupos:** el estudiante aprobado paga su puesto **a más tardar 10 minutos antes** de la salida; si no paga, pierde el puesto. Si deja un puesto con **40 minutos o más** de anticipación recupera todo; con menos, se le cobra el **30 %** (recupera el 70 %) y suma **1 strike**. Si el **conductor cancela un cupo con puestos pagados**, todos recuperan su dinero y él suma **1 strike**. Al terminar el cupo, el conductor recibe el 90 % de cada puesto pagado.
- **Strikes:** con **3 strikes** la cuenta queda **suspendida** (no puede pedir viajes, ofertar, publicar cupos ni pedir puestos). Primera suspensión **3 días**, luego **7**, **15** y de ahí en adelante **30**. Después de cada suspensión los strikes vuelven a cero.

**Provisional (propuesto)**
- Tope de $500.000 por recarga y de $1.000.000 de saldo.
- Dejar un cupo aprobado a menos de 40 minutos suma strike aunque no haya pagado.
- Al salir, los puestos aprobados que no se pagaron se liberan sin strike; para salir hace falta al menos un puesto pagado.

## Provisional (falta que el equipo decida)
| # | Pregunta | Cómo quedó mientras tanto |
|---|---|---|
| 1 | ¿Solo de ida a la universidad o también de regreso? | El viaje guarda origen y destino libres; no se obliga a que uno sea la universidad. |
| 4 | "IA para la mejor ruta": ¿modelo de IA o algoritmo? | No aplica con viajes de una persona; queda para cuando haya viajes compartidos. |
| 5 | ¿Las solicitudes vencen si nadie oferta? | No vencen; el estudiante las cancela. |

## Pendiente para otras fases
- ~~Ubicación de la sede~~: lista (migración 007).
- Supabase devuelve un error genérico ("Database error saving new user") cuando el trigger rechaza un correo. Por eso el formulario de registro (fase 2) también valida el dominio para mostrar un mensaje claro.
