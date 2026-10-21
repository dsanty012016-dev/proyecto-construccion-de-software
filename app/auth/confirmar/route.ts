import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { destinoSeguro } from "@/app/lib/rutas";
import { crearClienteServidor } from "@/app/lib/supabase/server";

// A esta ruta llegan los enlaces de los correos de Supabase (confirmar la
// cuenta y recuperar la contraseña). Valida el enlace, deja la sesión iniciada
// y manda a la persona a donde corresponde.
// Acepta los dos formatos de enlace de Supabase:
//  - token_hash + type: funciona aunque el correo se abra en otro dispositivo
//    (plantillas de correo configuradas en docs/supabase-auth.md).
//  - code: el formato por defecto; solo funciona en el mismo navegador.
export async function GET(peticion: NextRequest) {
  const parametros = peticion.nextUrl.searchParams;
  const tokenHash = parametros.get("token_hash");
  const tipo = parametros.get("type") as EmailOtpType | null;
  const codigo = parametros.get("code");
  const siguiente = destinoSeguro(parametros.get("siguiente"));

  const supabase = await crearClienteServidor();
  let valido = false;

  if (tokenHash && tipo) {
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    valido = !error;
  } else if (codigo) {
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    valido = !error;
  }

  if (!valido) {
    return NextResponse.redirect(new URL("/entrar?error=enlace", peticion.url));
  }

  // Un enlace de recuperación siempre lleva a crear la contraseña nueva.
  const destino = tipo === "recovery" ? "/nueva-clave" : siguiente;
  return NextResponse.redirect(new URL(destino, peticion.url));
}
