import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import postgres from "npm:postgres@3.4.7";
import { autenticarTarea } from "../_shared/autenticar-tarea.ts";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 2, prepare: false });
const archivos = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (entrada, opciones) => fetch(entrada, { ...opciones, signal: AbortSignal.timeout(8000) }) },
}).storage.from("documentos");

Deno.serve(async (peticion) => {
  if (peticion.method !== "POST") return new Response(null, { status: 405 });
  try {
    const autorizada = await autenticarTarea(peticion, async () => {
      const [fila] = await sql<{ hash: string | null }[]>`select privado.hash_token_tareas() hash`;
      return fila.hash;
    });
    if (!autorizada) return new Response(null, { status: 401 });
    const eliminados = await sql.begin(async (tx) => {
      const lote = await tx<{ ruta: string }[]>`select ruta from privado.documentos_para_limpiar()`;
      const rutas = lote.map((objeto) => objeto.ruta);
      if (!rutas.length) return 0;
      const { error } = await archivos.remove(rutas);
      if (error) throw new Error("Storage no confirmó la eliminación");
      await tx`delete from privado.documentos_reemplazados where ruta=any(${rutas}::text[])`;
      return rutas.length;
    });
    return Response.json({ eliminados });
  } catch {
    console.error("No se pudo completar la limpieza de documentos");
    return new Response(null, { status: 503 });
  }
});
