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
    .select("id, nombre, rol, telefono, disponible")
    .eq("id", data.user.id)
    .single();

  return { usuario: data.user, perfil };
}
