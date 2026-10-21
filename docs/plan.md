# Plan de fases

Una fase a la vez, cada una en su rama y con Pull Request. Modelo y esfuerzo son recomendaciones; si algo falla se sube primero el esfuerzo y, si se repite, se pasa al siguiente modelo.

| Fase | Trabajo | Modelo | Esfuerzo |
|---|---|---|---|
| 0 | Base: Next, tokens de color, fuentes, logos, PWA, `AGENTS.md`, CI | Sonnet 5.5 | Medio |
| 1 | Modelo de datos, SQL con RLS, `viaje.ts` y sus pruebas | Opus 5.5 | Alto |
| 2 | Registro, login, Google restringido al dominio, roles | Sonnet 5.5 (seguridad revisada con Opus) | Medio |
| 3 | Pantallas de estudiante y conductor según los mockups | Sonnet 5.5 | Medio |
| 4 | Mapa, ubicación y tiempo real (ofertas y seguimiento) | Opus diseña, Sonnet implementa | Alto, luego medio |
| 5 | Landing pública con A-Frame | Sonnet 5.5 | Medio |
| 6 | Textos, ajustes visuales, accesibilidad | Haiku 5.5 | Bajo |
| 7 | Revisión final de seguridad y datos | Opus 5.5 | Alto |

## Decisiones tomadas
- **Una sola app Next.js** (sitio público + app PWA + Supabase), no web y API separadas. Si luego se quiere app nativa, `app/api/v1/` y las reglas en la base de datos lo permiten sin rehacer.
- **Mapa:** MapLibre con estilo oscuro (gratis). El cálculo de rutas necesita un servicio aparte; se decide en la fase 4.
- **PWA:** manifiesto ahora; service worker y modo sin conexión después. Limitación: el navegador no envía ubicación con la pantalla apagada.
- **A-Frame:** solo en el sitio público (fase 5), no en la app.

## Mejoras frente a Duelo 64
Pruebas automáticas (Vitest) de las reglas, validación de formularios en el servidor (Zod), tipos generados desde Supabase, SQL numerado en carpeta fija y revisión automática en GitHub (lint y build en cada subida).
