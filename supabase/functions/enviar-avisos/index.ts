// Función de Supabase "enviar-avisos" (fase 12): manda las notificaciones al
// celular. La llama la base con pg_net (privado.avisar, migración 019)
// pasándole solo el número del aviso; aquí se toma de la base una sola vez
// (privado.tomar_aviso) y se envía a cada celular con las claves VAPID.
//
// Secretos (Edge Functions → Secrets): VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY.
// SUPABASE_DB_URL la pone Supabase. Se despliega con verify_jwt apagado: no
// recibe datos de nadie, solo un número que sin la base no sirve para nada.

import webpush from "npm:web-push@3.6.7";
import postgres from "npm:postgres@3.4.7";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 2, prepare: false });

webpush.setVapidDetails(
  "mailto:unigo2027@gmail.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

interface Destino {
  titulo: string;
  cuerpo: string;
  url: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

Deno.serve(async (peticion) => {
  if (peticion.method !== "POST") return new Response("Usa POST.", { status: 405 });
  const datos = await peticion.json().catch(() => null);
  const aviso = datos?.aviso;
  if (!Number.isSafeInteger(aviso) || aviso <= 0) return new Response("Aviso no válido.", { status: 400 });

  const destinos = await sql<Destino[]>`select * from privado.tomar_aviso(${aviso})`;
  const vencidas: string[] = [];
  let enviados = 0;

  await Promise.all(
    destinos.map(async (d) => {
      try {
        await webpush.sendNotification(
          { endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
          JSON.stringify({ titulo: d.titulo, cuerpo: d.cuerpo, url: d.url }),
          { TTL: 15 * 60, urgency: "high" },
        );
        enviados++;
      } catch (error) {
        const codigo = (error as { statusCode?: number }).statusCode;
        // 404 o 410: ese celular ya no tiene la suscripción (desinstaló o quitó el permiso).
        if (codigo === 404 || codigo === 410) vencidas.push(d.endpoint);
        else console.error("No se pudo enviar un aviso", codigo);
      }
    }),
  );

  if (vencidas.length > 0) await sql`select privado.borrar_suscripciones_vencidas(${sql.array(vencidas)})`;
  return Response.json({ enviados, vencidas: vencidas.length });
});
