import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./tipos";

// Cliente de Supabase para el navegador. Se usará para el tiempo real
// (ofertas y seguimiento, fase 4). Los cambios de datos van por Server Actions.
export function crearClienteNavegador() {
  // En el navegador Next reemplaza estas variables al compilar; por eso se
  // escriben completas y no se leen con variablesSupabase().
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
