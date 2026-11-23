# Uni, el asistente de UniGo

Botón flotante en toda la zona privada que abre un chat. Ayuda a moverse por
la app y a decidir, con humor pícaro pero amable ("¿A las 6? ¿Tú duermes o
solo parpadeas fuerte?"). Nunca bromea con seguridad, plata o reportes.

## Qué hace
- **Lleva a la pantalla correcta.** Responde con botones a pantallas de una
  lista cerrada (`DESTINOS` en `app/lib/asistente.ts`). La IA solo elige
  identificadores de esa lista; nunca escribe una ruta, y cada rol solo ve las
  suyas.
- **Ayuda a decidir.** Si la persona dice a qué hora tiene que llegar: con 45
  minutos o menos sugiere pedir el viaje ya; con más, buscar un cupo con hora
  fija (y si no hay, pedir unos 30 minutos antes). Al conductor le sugiere
  publicar su cupo.
- **No actúa por la persona.** No pide viajes, no paga ni cancela.

## Cómo responde
1. `preguntarAlAsistente` (`app/lib/acciones-asistente.ts`) valida el chat y la sesión.
2. Si hay `GEMINI_API_KEY` y la persona no pasó de **40 mensajes en el día**
   (función `usar_asistente`, migración 034), le pregunta a Gemini con
   respuesta en JSON y la valida con `interpretarRespuestaIA`.
3. Si no hay clave, se acabó el cupo, Gemini tarda más de 9 s o responde mal,
   contesta el **guion propio** (`respuestaDeGuion`), que entiende lo más común.

## Configuración (Vercel → Settings → Environment Variables)
- `GEMINI_API_KEY`: clave de Google AI Studio (aistudio.google.com → Get API key).
  El plan gratuito de la API no pide tarjeta. Ojo: Google AI Plus (la
  suscripción de la app de Gemini) no trae clave ni créditos de API.
- **Sin costo:** el proyecto "UniGo" de AI Studio está en el nivel gratuito y
  **sin cuenta de facturación** (revisado el 22 de noviembre de 2026), así que
  Google no puede cobrar nada. Gemini 3.5 Flash Lite tiene ahí 15 solicitudes
  por minuto y 500 por día; al pasarse, Google responde con error y Uni usa el
  guion. **No configurar facturación** en ese proyecto.
- `GEMINI_MODELO` (opcional): por defecto `gemini-3.5-flash-lite`. Si Google lo
  cambia, se pone aquí el modelo gratuito vigente sin tocar código.
- Aplicar `supabase/migraciones/034-asistente.sql`. Sin ella, Uni responde solo con el guion.

## Privacidad
A Gemini solo le llegan el rol, la hora y los mensajes del chat: ni nombre, ni
correo, ni teléfono, ni ubicación. El chat no se guarda. En el plan gratuito,
Google puede usar los mensajes para mejorar sus productos, por eso el chat lo
avisa y pide no escribir datos personales. Antes de abrirlo al público hay que
agregar a Google (Gemini) como encargado en la política de privacidad (Ley 1581).
