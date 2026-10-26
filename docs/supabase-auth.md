# Configuración de Supabase Auth (proyecto Unigo)

La app vive en **https://unigoproject.vercel.app** (Vercel, proyecto del equipo UniGo, se publica solo con cada merge a `main`). Las variables de Vercel son las mismas dos de `.env.example`.

Los enlaces de los correos (confirmar cuenta, recuperar contraseña) usan la dirección desde donde se pidió. Supabase solo la acepta si está en "Redirect URLs"; si no, manda a la "Site URL". Por eso la Site URL es la de Vercel: así un correo nunca lleva a `localhost`.

Hecho en el panel (no vive en migraciones):

| Dónde | Valor |
|---|---|
| Authentication → URL Configuration → Site URL | `https://unigoproject.vercel.app` |
| Authentication → URL Configuration → Redirect URLs | `https://unigoproject.vercel.app/**`, `https://unigoproject-*.vercel.app/**` (vistas previas de Vercel) y `http://localhost:3000/**` (para desarrollar) |
| Sign In / Providers → Confirm email | Activado |
| Sign In / Providers → Email → Minimum password length | 8 |

## Correos: límite importante
Sin un servidor de correo propio (SMTP), Supabase usa el suyo, que:
- solo entrega correos a los **miembros del equipo** del proyecto en Supabase,
- envía muy pocos por hora,
- no deja editar las plantillas (salen en inglés).

Para que cualquier estudiante reciba el correo de confirmación hay que configurar SMTP (Authentication → Emails → SMTP Settings), por ejemplo con Resend (plan gratis). Mientras tanto, para probar: después de registrarse, en Authentication → Users se puede confirmar a mano.

Cuando haya SMTP, cambiar las plantillas "Confirm sign up" y "Reset password" para que el enlace sea
`{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=email` (y `type=recovery` para la de contraseña). Ese formato funciona aunque el correo se abra en otro dispositivo; `/auth/confirmar` ya lo entiende.

## Inicio con Microsoft
Pendiente. La USTA no deja entrar al portal de administración de Microsoft (403) y una cuenta personal ya no puede registrar apps sin directorio. Se necesita una cuenta de Azure (por ejemplo Azure for Students) para registrar la app y probar si la USTA permite autorizarla.
