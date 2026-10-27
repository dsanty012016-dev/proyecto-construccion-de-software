import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { redireccionPara } from "@/app/lib/rutas";

// Proxy de Next 16 (antes "middleware"): corre antes de cada página.
// 1. Renueva la sesión de Supabase y la guarda en las cookies.
// 2. Manda a /entrar a quien entra sin sesión a la zona privada, y a /inicio a
//    quien ya tiene sesión y abre /entrar o /registro.
// Las páginas vuelven a revisar la sesión por su cuenta: esto es comodidad,
// la seguridad real está en Supabase (RLS).
export async function proxy(peticion: NextRequest) {
  let respuesta = NextResponse.next({ request: peticion });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !clave) return respuesta;

  const supabase = createServerClient(url, clave, {
    cookies: {
      getAll() {
        return peticion.cookies.getAll();
      },
      setAll(cookiesNuevas) {
        cookiesNuevas.forEach(({ name, value }) => peticion.cookies.set(name, value));
        respuesta = NextResponse.next({ request: peticion });
        cookiesNuevas.forEach(({ name, value, options }) =>
          respuesta.cookies.set(name, value, options),
        );
      },
    },
  });

  // getClaims valida el token (no solo lo lee) y lo renueva si hace falta.
  const { data } = await supabase.auth.getClaims();
  const conSesion = Boolean(data?.claims);

  const destino = redireccionPara(peticion.nextUrl.pathname, conSesion);
  if (!destino) return respuesta;

  // Al redirigir hay que conservar las cookies renovadas.
  const redireccion = NextResponse.redirect(new URL(destino, peticion.url));
  respuesta.cookies.getAll().forEach((cookie) => redireccion.cookies.set(cookie));
  return redireccion;
}

export const config = {
  matcher: [
    // Todo menos archivos estáticos, imágenes, íconos, el manifiesto y el service worker.
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|manifest.webmanifest|sw.js|brand/|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
