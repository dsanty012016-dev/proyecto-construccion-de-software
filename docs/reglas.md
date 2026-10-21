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

## Cupos publicados por el conductor (fase 4c, por construir)
La otra forma de viajar: el conductor publica su recorrido y los estudiantes piden subirse en un punto del camino.

**Decidido por el equipo**
- El conductor publica un **cupo**: punto de salida, **hora de salida**, **número de puestos** y **precio fijo por puesto**. El destino es la universidad.
- Un estudiante pide subirse indicando su **punto de recogida** en el mapa. El **conductor aprueba o rechaza** cada solicitud (ve qué tan lejos queda de su ruta).
- Cada estudiante aprobado ocupa un puesto y paga el precio del puesto; la comisión del 10 % se le descuenta al conductor por cada estudiante.
- Esto **cambia** la regla anterior de "viajes de una persona": en un cupo pueden ir varios estudiantes.

- **Hora definida con anticipación:** el cupo siempre se publica con su hora de salida (no hay cupos "para ya").
- **Pago:** se hace a más tardar **10 minutos antes** de la hora de salida. Quien no haya pagado para entonces pierde el puesto (cómo se libera el puesto queda por definir en la fase de pagos).

**Provisional (propuesto, falta confirmar)**
- Puestos: moto 1 (la placa ABC12D lo dice); carro de 1 a 4.
- Hora de salida: desde ahora hasta 7 días adelante. Las solicitudes se cierran a la hora de salida.
- Nadie tiene a la vez un viaje pedido activo y un puesto aprobado en un cupo.
- Cancelar: el estudiante puede retirar su solicitud o su puesto antes de que el cupo salga; si el conductor cancela el cupo, se cancelan todos los puestos. Sin penalización (igual que hoy).
- No hay límite fijo de desvío: el conductor decide al aprobar, viendo la distancia a su ruta.

## Cambio de rol (decidido, para una fase futura)
- Una misma cuenta puede usar la app **como estudiante y como conductor**: quien se registró como pasajero puede pasar a conductor si un día va a llevar a alguien, y al revés.
- Para usar el modo conductor hace falta tener un vehículo registrado.
- Hoy el rol se elige una sola vez (`elegir_rol` en 002-perfiles.sql). Cambiarlo implica pasar de "rol fijo" a "modo actual" en la base y en las pantallas, sin mezclar un viaje como pasajero con uno como conductor al mismo tiempo.

## Provisional (falta que el equipo decida)
| # | Pregunta | Cómo quedó mientras tanto |
|---|---|---|
| 1 | ¿Solo de ida a la universidad o también de regreso? | El viaje guarda origen y destino libres; no se obliga a que uno sea la universidad. |
| 2 | Cancelaciones: ¿quién, cuándo y con qué penalización? | El estudiante cancela mientras busca conductor; ya aceptado, cancela cualquiera de los dos; en curso nadie. **Sin penalización.** |
| 4 | "IA para la mejor ruta": ¿modelo de IA o algoritmo? | No aplica con viajes de una persona; queda para cuando haya viajes compartidos. |
| 5 | ¿Las solicitudes vencen si nadie oferta? | No vencen; el estudiante las cancela. |

## Pendiente para otras fases
- ~~Ubicación de la sede~~: lista (migración 007).
- Supabase devuelve un error genérico ("Database error saving new user") cuando el trigger rechaza un correo. Por eso el formulario de registro (fase 2) también valida el dominio para mostrar un mensaje claro.
