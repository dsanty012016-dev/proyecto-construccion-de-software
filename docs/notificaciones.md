# Notificaciones en el celular (fase 12)

## Cómo funcionan
1. La persona toca "Activar notificaciones" (inicio o perfil). El navegador pide el permiso y entrega una suscripción, que se guarda con `guardar_suscripcion` (019) en `privado.suscripciones_push`.
2. Cuando pasa algo (oferta, aceptación, cupo que sale...), un trigger crea el aviso en `privado.avisos` y, con pg_net, llama a la función de Supabase **enviar-avisos** con el número del aviso.
3. La función toma el aviso una sola vez (`privado.tomar_aviso`) y lo manda a cada celular con las claves VAPID. Los celulares que ya no existen se borran.
4. El service worker (`public/sw.js`) muestra la notificación y, al tocarla, abre UniGo en la pantalla del aviso.

Si la función no responde en el momento, cada 2 minutos se reintentan los avisos pendientes de los últimos 30 minutos; los de más de 7 días se borran (migración 020).

En iPhone solo llegan con UniGo instalada en la pantalla de inicio (iOS 16.4 o más nuevo). La tarjeta lo explica.

## Cambio de cuenta y cierre de sesión
- Al abrir el inicio o el perfil, una suscripción que ya exista en el navegador se vuelve a asociar a la cuenta con sesión antes de mostrar "Notificaciones activas". No se vuelve a pedir el permiso del navegador.
- Al cerrar sesión desde el perfil, el navegador identifica su suscripción y el servidor la borra con `borrar_suscripcion` antes de cerrar la sesión. Las suscripciones de otros celulares se conservan.
- Si falla la lectura de la suscripción o su borrado, se muestra el error y se permite reintentar; el cierre no se anuncia como correcto.
- Si no se puede asociar una suscripción heredada a la cuenta actual, se intenta cancelarla en el navegador y se muestra cómo volver a activarla.
- Las activaciones y el cierre se ordenan para que una petición pendiente no vuelva a guardar la suscripción después del borrado. Cuando está disponible, Web Locks coordina también las pestañas del mismo sitio.
- Al apagar las notificaciones, se cancela también la suscripción del navegador para que no se restaure al volver al perfil. Los errores del servidor se muestran en pantalla.
- No requiere migraciones: usa las funciones y permisos de la migración 019.

## Qué se avisa
Ver la cabecera de `supabase/migraciones/019-notificaciones.sql` (lo decidió el equipo).

## Configuración (una sola vez)
1. **Claves VAPID.** En el computador, dentro del proyecto: `npx web-push generate-vapid-keys`. Da una clave pública y una privada. La privada no se comparte ni se sube al repositorio.
2. **Supabase → Edge Functions → Secrets:** `VAPID_PUBLIC_KEY` (la pública) y `VAPID_PRIVATE_KEY` (la privada).
3. **Vercel → Settings → Environment Variables:** `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (solo la pública) y volver a publicar.
4. La función `enviar-avisos` (`supabase/functions/enviar-avisos/`) se publica en Supabase con **verify_jwt apagado**: solo recibe el número de un aviso, que sin la base no sirve para nada, y un aviso se envía una sola vez.

Sin la clave pública en Vercel, la tarjeta para activar las notificaciones no aparece.
