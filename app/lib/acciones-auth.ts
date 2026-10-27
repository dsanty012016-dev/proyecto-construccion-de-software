"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { EstadoFormulario } from "./estado-formulario";
import { VERSION_POLITICA } from "./privacidad";
import { destinoSeguro } from "./rutas";
import { crearClienteServidor } from "./supabase/server";
import {
  datosDelFormulario,
  erroresPorCampo,
  esquemaEntrar,
  esquemaNuevaClave,
  esquemaRecuperar,
  esquemaRegistro,
  esquemaRol,
} from "./validaciones-auth";

// Server Actions de acceso: registro, entrar, salir, recuperar la contraseña y
// elegir rol. Validan con Zod, llaman a Supabase y devuelven un estado que el
// formulario muestra. Los mensajes de Supabase (en inglés) se traducen aquí.

const MENSAJE_GENERICO = "No pudimos completar la acción. Intenta de nuevo en un momento.";

function sinClaves(datos: Record<string, string>) {
  const copia = { ...datos };
  delete copia.clave;
  delete copia.confirmacion;
  return copia;
}

/**
 * Dirección del sitio para los enlaces de los correos: la misma desde donde se
 * pidió (https://unigoproject.vercel.app en producción, localhost al
 * desarrollar). Supabase solo la respeta si está en "Redirect URLs"; si no,
 * usa la "Site URL" (ver docs/supabase-auth.md).
 */
async function origen() {
  const cabeceras = await headers();
  const declarado = cabeceras.get("origin");
  if (declarado) return declarado;
  const host = cabeceras.get("x-forwarded-host") ?? cabeceras.get("host");
  const protocolo = cabeceras.get("x-forwarded-proto") ?? "https";
  return `${protocolo}://${host}`;
}

function traducirError(mensaje: string, codigo?: string): string {
  const texto = `${codigo ?? ""} ${mensaje}`.toLowerCase();
  if (texto.includes("invalid login credentials") || texto.includes("invalid_credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (texto.includes("email not confirmed") || texto.includes("email_not_confirmed")) {
    return "Todavía no has confirmado tu correo. Busca el enlace que te enviamos (revisa también la carpeta de spam).";
  }
  if (texto.includes("rate limit") || texto.includes("over_email_send_rate_limit") || texto.includes("too many")) {
    return "Hiciste demasiados intentos seguidos. Espera unos minutos y vuelve a intentar.";
  }
  if (texto.includes("database error saving new user")) {
    // Lo rechazó el trigger de la base (correo o teléfono): ya se validó
    // antes, así que casi nunca llega aquí.
    return "Revisa que el correo sea institucional y el celular tenga 10 dígitos.";
  }
  if (texto.includes("same_password") || texto.includes("should be different")) {
    return "La nueva contraseña debe ser distinta de la anterior.";
  }
  if (texto.includes("weak_password") || texto.includes("password should")) {
    return "Esa contraseña es muy débil. Usa al menos 8 caracteres con letras y números.";
  }
  return MENSAJE_GENERICO;
}

export async function registrarse(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const datos = datosDelFormulario(formulario);
  const validado = esquemaRegistro.safeParse(datos);
  if (!validado.success) {
    return { resultado: "error", errores: erroresPorCampo(validado.error), valores: sinClaves(datos) };
  }
  const { nombre, correo, telefono, rol, clave } = validado.data;

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signUp({
    email: correo,
    password: clave,
    options: {
      // Estos datos los lee el trigger que crea el perfil (002 y 016): también
      // queda guardada la versión de la política de privacidad que aceptó.
      data: { nombre, telefono, rol, politica: VERSION_POLITICA },
      emailRedirectTo: `${await origen()}/auth/confirmar`,
    },
  });
  if (error) {
    return { resultado: "error", mensaje: traducirError(error.message, error.code), valores: sinClaves(datos) };
  }

  // Si el correo ya tenía cuenta, Supabase responde igual (para no revelar
  // quién está registrado); por eso el mensaje es el mismo en ambos casos.
  return {
    resultado: "listo",
    mensaje: `Te enviamos un enlace a ${correo}. Ábrelo para activar tu cuenta.`,
  };
}

export async function entrar(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const datos = datosDelFormulario(formulario);
  const validado = esquemaEntrar.safeParse(datos);
  if (!validado.success) {
    return { resultado: "error", errores: erroresPorCampo(validado.error), valores: sinClaves(datos) };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: validado.data.correo,
    password: validado.data.clave,
  });
  if (error) {
    return { resultado: "error", mensaje: traducirError(error.message, error.code), valores: sinClaves(datos) };
  }

  redirect(destinoSeguro(datos.siguiente));
}

export async function salir() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/entrar");
}

export async function recuperarClave(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const datos = datosDelFormulario(formulario);
  const validado = esquemaRecuperar.safeParse(datos);
  if (!validado.success) {
    return { resultado: "error", errores: erroresPorCampo(validado.error), valores: datos };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.resetPasswordForEmail(validado.data.correo, {
    redirectTo: `${await origen()}/auth/confirmar?siguiente=/nueva-clave`,
  });
  if (error && traducirError(error.message, error.code) !== MENSAJE_GENERICO) {
    return { resultado: "error", mensaje: traducirError(error.message, error.code), valores: datos };
  }

  // Mismo mensaje exista o no la cuenta, para no revelar quién está registrado.
  return {
    resultado: "listo",
    mensaje: `Si ${validado.data.correo} tiene cuenta en UniGo, te llegará un enlace para crear una contraseña nueva.`,
  };
}

export async function guardarNuevaClave(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const validado = esquemaNuevaClave.safeParse(datosDelFormulario(formulario));
  if (!validado.success) {
    return { resultado: "error", errores: erroresPorCampo(validado.error) };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.updateUser({ password: validado.data.clave });
  if (error) {
    return { resultado: "error", mensaje: traducirError(error.message, error.code) };
  }
  redirect("/inicio?clave=actualizada");
}

export async function elegirRol(
  _anterior: EstadoFormulario,
  formulario: FormData,
): Promise<EstadoFormulario> {
  const validado = esquemaRol.safeParse(datosDelFormulario(formulario));
  if (!validado.success) {
    return { resultado: "error", errores: erroresPorCampo(validado.error) };
  }

  const supabase = await crearClienteServidor();
  // La regla (solo una vez) la hace cumplir la función elegir_rol de la base.
  const { error } = await supabase.rpc("elegir_rol", { p_rol: validado.data.rol });
  if (error && !error.message.includes("ya está definido")) {
    return { resultado: "error", mensaje: MENSAJE_GENERICO };
  }
  redirect("/inicio");
}

/** Quien ya tenía cuenta (o una versión vieja) acepta la política vigente (016). */
export async function aceptarPolitica(_anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  if (formulario.get("acepto") !== "on") {
    return { resultado: "error", errores: { acepto: "Para seguir usando UniGo debes aceptar la política." } };
  }
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("aceptar_politica", { p_version: VERSION_POLITICA });
  if (error) return { resultado: "error", mensaje: MENSAJE_GENERICO };
  redirect("/inicio");
}

/** Tipos de enlace de los correos de Supabase que acepta /continuar. */
const TIPOS_ENLACE = ["email", "signup", "recovery", "invite", "magiclink", "email_change"] as const;

/**
 * Usa el enlace del correo (confirmar cuenta o recuperar contraseña) cuando la
 * persona toca "Continuar" en /continuar. Si ya se usó o venció, vuelve a
 * /entrar con el aviso.
 */
export async function usarEnlaceDeCorreo(formulario: FormData) {
  const tokenHash = String(formulario.get("token_hash") ?? "");
  const tipo = String(formulario.get("type") ?? "");
  const siguiente = destinoSeguro(String(formulario.get("siguiente") ?? ""));
  const tipoValido = (TIPOS_ENLACE as readonly string[]).includes(tipo);
  if (!tipoValido || !/^[A-Za-z0-9_-]{8,256}$/.test(tokenHash)) redirect("/entrar?error=enlace");

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.verifyOtp({ type: tipo as (typeof TIPOS_ENLACE)[number], token_hash: tokenHash });
  if (error) redirect("/entrar?error=enlace");
  redirect(tipo === "recovery" ? "/nueva-clave" : siguiente);
}
