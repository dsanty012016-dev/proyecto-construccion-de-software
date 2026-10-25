# Plan de fases

Una fase a la vez, cada una en su rama y con Pull Request. Modelo y esfuerzo son recomendaciones; si algo falla se sube primero el esfuerzo y, si se repite, se pasa al siguiente modelo.

| Fase | Trabajo | Modelo | Esfuerzo |
|---|---|---|---|
| 0 | Base: Next, tokens de color, fuentes, logos, PWA, `AGENTS.md`, CI | Sonnet 5.5 | Medio |
| 1 | Modelo de datos, SQL con RLS, `viaje.ts` y sus pruebas | Opus 5.5 | Alto |
| 2 | Registro, login, Google restringido al dominio, roles | Sonnet 5.5 (seguridad revisada con Opus) | Medio |
| 3 | Pantallas de estudiante y conductor según el diseño nuevo (lienzo "UniGo · Pantallas fase 3") | Sonnet 5.5 | Medio |
| 4 | Mapa, ubicación y tiempo real (ofertas y seguimiento) | Opus diseña, Sonnet implementa | Alto, luego medio |
| 5 | Landing pública con A-Frame | Sonnet 5.5 | Medio |
| 6 | Textos, ajustes visuales, accesibilidad | Haiku 5.5 | Bajo |
| 4c | Cupos publicados por el conductor: hora de salida, puestos, precio por puesto y solicitudes en el trayecto que el conductor aprueba | Opus diseña, Sonnet implementa | Alto, luego medio |
| 4d | Cambio de rol: la misma cuenta usa la app como estudiante o como conductor | Opus diseña, Sonnet implementa | Alto, luego medio |
| 4e | Verificación del conductor: cédula, licencia y tarjeta de propiedad revisadas por un administrador | Opus | Alto |
| 4b | Billetera simulada: saldo, recargas de prueba, pago del viaje y comisión del 10 % al conductor (rama `fase-pagos`) | Opus diseña, Sonnet implementa | Alto, luego medio |
| 7 | Revisión final de seguridad y datos | Opus 5.5 | Alto |

## Avance
- Fase 0: lista (rama `fase-0-base`).
- Fase 1: lista (rama `fase-1-reglas`). `viaje.ts` con 25 pruebas; 5 migraciones con 85 comprobaciones de RLS y RPC que GitHub corre en cada subida. Falta aplicarlas en un proyecto de Supabase real.

- Fase 2: registro, entrar, recuperar contraseña y elegir rol con correo y contraseña (rama `fase-2-auth`). Migraciones aplicadas en el proyecto Unigo de Supabase. Configuración del panel en `docs/supabase-auth.md`.

- Fase 3: pantallas de estudiante y conductor, barra inferior, calificación e historial (rama `fase-3-pantallas`). Migración 007 con la ubicación de la sede.
- Fase 4, parte 1: mapa (MapLibre + OpenFreeMap) para elegir la recogida, mapas en los viajes y tiempo real con Supabase Realtime (rama `fase-4-mapa`, migración 008). Parte 2: seguimiento en vivo del conductor y "Compartir viaje" con enlace público (rama `fase-4g-seguimiento`, migración 013).
- Fase 4d: cambio de modo estudiante ↔ conductor con la misma cuenta (rama `fase-4d-cambio-rol`, migración 009).
- Fase 4c: cupos publicados por el conductor y puestos que piden los estudiantes, con aprobación (rama `fase-4c-cupos`, migración 010).
- Fase 4e: verificación del conductor con documentos en almacenamiento privado y panel de administración (rama `fase-4e-verificacion`, migración 011).
- Fase 4b: billetera simulada, pago al aceptar y retenido hasta terminar, cobros por cancelación, pago de cupos 10 min antes, strikes y suspensiones (rama `fase-4b-billetera`, migración 012).
- Fase 6 (pulido, parte 2): bordes de los campos y textos de ayuda con el contraste que pide WCAG, texto de elegir rol al día con el cambio de modo, botones de acceso con la misma letra (rama `fase-6-pulido-2`).
- Fase 6 (pulido, parte 1): confirmaciones dentro del botón en vez de la ventana del navegador, pantallas de "no existe", error y carga, calificación con estrella dibujada, selección y barras con la paleta, perfil en filas (rama `fase-6-pulido`).
- Fase 4h: cupos completos: calificaciones, historial, seguimiento en vivo, compartir por estudiante y orden de recogida (rama `fase-4h-cupos-completos`, migración 014).
- Fase 5: landing pública rediseñada con la skill impeccable (lienzo "UniGo · Landing (impeccable)"): del "¿alguien va pa' la U?" del grupo a la ruta en cuatro paradas, cupos, seguridad, precios, conducir y equipo. Reusa la escena 3D de A-Frame del PR #3 con mapa SVG de respaldo (rama `fase-5-landing-impeccable`).
- Fase 4f: rediseño de la zona privada con la skill impeccable, mapa teñido con la paleta y páginas más rápidas (rama `fase-4f-rediseno`).

## Decisiones tomadas
- **Una sola app Next.js** (sitio público + app PWA + Supabase), no web y API separadas. Si luego se quiere app nativa, `app/api/v1/` y las reglas en la base de datos lo permiten sin rehacer.
- **Mapa:** MapLibre con el estilo oscuro de OpenFreeMap (gratis, sin clave, datos de OpenStreetMap). La ruta por las vías la calcula el servicio público de FOSSGIS (OSRM sobre OpenStreetMap; máximo 1 consulta por segundo, con créditos en el mapa). Si falla, se dibuja la línea recta. Para navegar paso a paso, el conductor abre Google Maps. Con usuarios reales habría que tener un servidor de rutas propio o uno de pago.
- **Tiempo real:** Supabase Realtime sobre `viajes` y `ofertas` (respeta RLS), con refresco de respaldo cada 30 s.
- **PWA:** manifiesto ahora; service worker y modo sin conexión después. Limitación: el navegador no envía ubicación con la pantalla apagada.
- **A-Frame:** solo en el sitio público (fase 5), no en la app.

## Mejoras frente a Duelo 64
Pruebas automáticas (Vitest) de las reglas, validación de formularios en el servidor (Zod), tipos generados desde Supabase, SQL numerado en carpeta fija y revisión automática en GitHub (lint y build en cada subida).
