import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { crearClienteServidor } from "./supabase/server";

// Datos de la persona con sesión para las páginas privadas. Si no hay sesión
// manda a /entrar (además del proxy, por si acaso).
//
// Rapidez: el layout y la página la piden en la misma petición, así que va con
// cache() de React y se calcula una sola vez. Y usa getClaims, que revisa la
// firma del token en el servidor sin ir a Supabase Auth cuando el proyecto
// firma con llaves asimétricas (si no, hace la misma consulta que getUser).
export const perfilActual = cache(async () => {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/entrar");
  const usuario = { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };

  // RLS: cada quien solo puede leer su propio perfil.
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre, rol, telefono, disponible, universidad_id, es_admin, politica_version")
    .eq("id", usuario.id)
    .single();

  return { usuario, perfil };
});

/** Ruta de inicio de cada rol (null si todavía no eligió). */
export function inicioDeRol(rol: "estudiante" | "conductor" | null | undefined) {
  if (rol === "estudiante") return "/estudiante";
  if (rol === "conductor") return "/conductor";
  return "/elegir-rol";
}

/**
 * Para las zonas de un solo rol: si la persona es de otro rol (o no tiene),
 * se le manda a su inicio. La seguridad de verdad está en RLS y en las
 * funciones de la base; esto solo evita mostrar pantallas que no le sirven.
 */
export async function exigirRol(rol: "estudiante" | "conductor") {
  const sesion = await perfilActual();
  if (!sesion.perfil || sesion.perfil.rol !== rol) redirect(inicioDeRol(sesion.perfil?.rol));
  return { usuario: sesion.usuario, perfil: sesion.perfil };
}

/** Zona de administración: solo cuentas marcadas como administrador (011). */
export async function exigirAdmin() {
  const sesion = await perfilActual();
  if (!sesion.perfil?.es_admin) redirect(inicioDeRol(sesion.perfil?.rol));
  return { usuario: sesion.usuario, perfil: sesion.perfil };
}
