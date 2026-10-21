# Reglas del viaje (borrador)

Estado: **incompleto**. Lo marcado con ❓ lo tiene que decidir el equipo; hasta entonces la fase 1 (modelo de datos y `viaje.ts`) no empieza.

## Lo que ya sabemos
Sacado de los mockups (`docs/diseno/`) y de la landing original (`docs/landing-original/`).

- **Ciudad:** Villavicencio, Colombia.
- **Roles:** estudiante y conductor. El registro pide nombre, correo institucional, teléfono (+57), tipo de usuario, contraseña y aceptar términos.
- **Acceso:** correo y contraseña, o Google. Recuperar contraseña envía un **enlace** al correo.
- **Estudiante:** ve un mapa con la ruta y tiempos (por ejemplo "8 min · 2,4 km"); accesos a *Solicitar viaje*, *Mis viajes*, *Favoritos* y *Pago*.
- **Conductor:** interruptor "Estás disponible" para recibir solicitudes; estadísticas (viajes, calificación, % de aceptación); ingresos por día de la semana; *Mis viajes* y *Vehículo*.
- **Navegación:** barra inferior con Inicio, Viajes, Wallet y Perfil, igual para los dos roles.
- **Viajes compartidos:** la landing dice que la IA optimiza la ruta "cuando el conductor tiene varias personas por recoger a la vez".

## Preguntas abiertas
| # | Pregunta | Por qué importa |
|---|---|---|
| 1 | ❓ ¿El conductor también debe ser estudiante de la universidad? ¿Cómo se verifica? | Define el registro y las políticas de seguridad |
| 2 | ❓ ¿Quién fija el precio? (el estudiante propone y el conductor contraoferta, como InDrive; tarifa fija; o el costo se divide entre quienes comparten) | Es el corazón del estado del viaje |
| 3 | ❓ ¿Un viaje es de una persona o se comparte entre varias? ¿Cuántas recogidas máximo? | Cambia el modelo de datos |
| 4 | ❓ ¿Qué universidades de Villavicencio entran? ¿Solo de ida a la universidad o también de regreso? | Destinos y correos permitidos |
| 5 | ❓ ¿Dominios de correo institucional aceptados? | Filtro de registro y de Google |
| 6 | ❓ Wallet y pagos: ¿dinero real o simulado? (recomendado: simulado) | Alcance y riesgo legal |
| 7 | ❓ "IA para la mejor ruta": ¿modelo de IA real o un algoritmo que ordene las recogidas? (recomendado: algoritmo) | Alcance y explicación en la presentación |
| 8 | ❓ ¿Qué pasa si un conductor o estudiante cancela? ¿Hay penalización? | Estados del viaje |

## Estados del viaje (propuesta, a validar con las respuestas)
`solicitado → con ofertas → aceptado → conductor en camino → en curso → terminado`, con `cancelado` posible antes de `en curso`. La lógica irá en `app/lib/viaje.ts` como funciones puras con pruebas.
