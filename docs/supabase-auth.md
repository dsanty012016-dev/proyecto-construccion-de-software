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

## Correos: Gmail del proyecto
El servidor de correo de prueba de Supabase solo entrega a los miembros del equipo del proyecto y muy pocos por hora. Por eso los correos salen de un **Gmail del proyecto** (gratis, sin dominio propio, unos 500 por día). Si algún día hay dominio, se cambia a Resend solo en este panel; el código no cambia.

**1. En el Gmail del proyecto**
1. Activar la verificación en dos pasos (Cuenta de Google → Seguridad).
2. Crear una **contraseña de aplicación** (Cuenta de Google → Seguridad → Contraseñas de aplicaciones), nombre "Supabase UniGo". Son 16 letras; se copian sin espacios y no se guardan en ningún archivo del repositorio.

**2. En Supabase → Authentication → Emails → SMTP Settings** (activar "Enable custom SMTP")

| Campo | Valor |
|---|---|
| Sender email | el Gmail del proyecto |
| Sender name | `UniGo` |
| Host | `smtp.gmail.com` |
| Port | `465` |
| Username | el Gmail del proyecto |
| Password | la contraseña de aplicación |

**3. En Supabase → Authentication → Rate Limits:** subir "emails sent per hour" (con SMTP propio arranca en 30) a unos `100`.

**4. Plantillas en español** (Authentication → Emails → Templates). Están en `supabase/plantillas-correo/`: se copia el asunto que dice cada archivo y se pega el HTML.
- "Confirm signup" → `confirmar-cuenta.html`
- "Reset Password" → `recuperar-clave.html`

El enlace de las plantillas usa `token_hash`, así que funciona aunque el correo se abra en otro dispositivo o navegador (lo recibe `/auth/confirmar`).

**Para probar:** crear una cuenta con un correo institucional y pedir "Recuperar contraseña" desde https://unigoproject.vercel.app. Los dos correos deben llegar en español, desde "UniGo", y abrir la página de Vercel. Si no llegan, revisar en Supabase → Logs → Auth.

## Inicio con Microsoft
Pendiente. La USTA no deja entrar al portal de administración de Microsoft (403) y una cuenta personal ya no puede registrar apps sin directorio. Se necesita una cuenta de Azure (por ejemplo Azure for Students) para registrar la app y probar si la USTA permite autorizarla.
