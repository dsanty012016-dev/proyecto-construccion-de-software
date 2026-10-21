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

## Provisional (falta que el equipo decida)
| # | Pregunta | Cómo quedó mientras tanto |
|---|---|---|
| 1 | ¿Solo de ida a la universidad o también de regreso? | El viaje guarda origen y destino libres; no se obliga a que uno sea la universidad. |
| 2 | Cancelaciones: ¿quién, cuándo y con qué penalización? | El estudiante cancela mientras busca conductor; ya aceptado, cancela cualquiera de los dos; en curso nadie. **Sin penalización.** |
| 4 | "IA para la mejor ruta": ¿modelo de IA o algoritmo? | No aplica con viajes de una persona; queda para cuando haya viajes compartidos. |
| 5 | ¿Las solicitudes vencen si nadie oferta? | No vencen; el estudiante las cancela. |

## Pendiente para otras fases
- Ubicación exacta de la sede (columnas `lat` y `lng` de `universidades`): se llena en la fase 4 con el mapa.
- Supabase devuelve un error genérico ("Database error saving new user") cuando el trigger rechaza un correo. Por eso el formulario de registro (fase 2) también valida el dominio para mostrar un mensaje claro.
