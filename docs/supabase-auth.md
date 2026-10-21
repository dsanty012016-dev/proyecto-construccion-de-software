# Configuración de Supabase Auth (proyecto Unigo)

Hecho en el panel (no vive en migraciones):

| Dónde | Valor |
|---|---|
| Authentication → URL Configuration → Site URL | `http://localhost:3000` (cambiar a la URL de Vercel al publicar) |
| Authentication → URL Configuration → Redirect URLs | `http://localhost:3000/**` (agregar la de Vercel al publicar) |
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
