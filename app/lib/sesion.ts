import "server-only";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "./supabase/server";

// Datos de la persona con sesión para las páginas privadas. Si no hay sesión
// manda a /entrar (además del proxy, por si acaso).
export async function perfilActual() {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/entrar");

  // RLS: cada quien solo puede leer su propio perfil.
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre, rol, telefono, disponible, universidad_id, es_admin")
    .eq("id", data.user.id)
    .single();

  return { usuario: data.user, perfil };
}

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
