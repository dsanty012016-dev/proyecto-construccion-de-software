import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./tipos";
import { variablesSupabase } from "./variables";

// Cliente de Supabase para el servidor (Server Components, Server Actions y
// rutas). Lee y guarda la sesión en las cookies de la petición. Se crea uno
// nuevo por petición: nunca se comparte entre usuarios.
export async function crearClienteServidor() {
  const almacen = await cookies();
  const { url, clave } = variablesSupabase();

  return createServerClient<Database>(url, clave, {
    cookies: {
      getAll() {
        return almacen.getAll();
      },
      setAll(cookiesNuevas) {
        try {
          cookiesNuevas.forEach(({ name, value, options }) =>
            almacen.set(name, value, options),
          );
        } catch {
          // Desde un Server Component no se pueden escribir cookies; el
          // proxy (proxy.ts) ya renueva la sesión en cada petición.
        }
      },
    },
  });
}
