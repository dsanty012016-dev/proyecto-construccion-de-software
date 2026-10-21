// Lee las variables públicas de Supabase (.env.local) y avisa claro si faltan,
// en vez de fallar con un error confuso dentro de la librería.
export function variablesSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !clave) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local (ver .env.example).",
    );
  }
  return { url, clave };
}
