// Función de Supabase "enviar-avisos" (fase 12): manda las notificaciones al
// celular. La llama la base con pg_net (privado.avisar, migración 019)
// pasándole solo el número del aviso. Se reserva y confirma cada celular con
// las funciones de 022, para poder reintentar sin repetir los éxitos parciales.
//
// Secretos (Edge Functions → Secrets): VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY.
// SUPABASE_DB_URL la pone Supabase. Se despliega con verify_jwt apagado: no
// recibe datos de nadie, solo un número que sin la base no sirve para nada.

import webpush from "npm:web-push@3.6.7";
import postgres from "npm:postgres@3.4.7";
import { enviarEntregas, type Entrega } from "./entregas.ts";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 2, prepare: false });

webpush.setVapidDetails(
  "mailto:unigo2027@gmail.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

Deno.serve(async (peticion) => {
  if (peticion.method !== "POST") return new Response("Usa POST.", { status: 405 });
  const datos = await peticion.json().catch(() => null);
  const aviso = datos?.aviso;
  if (!Number.isSafeInteger(aviso) || aviso <= 0) return new Response("Aviso no válido.", { status: 400 });

  const destinos = await sql<Entrega[]>`select * from privado.reservar_entregas(${aviso})`;
  const { enviados, vencidas, fallidos } = await enviarEntregas(
    destinos,
    (d) => webpush.sendNotification(
          { endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
          JSON.stringify({ titulo: d.titulo, cuerpo: d.cuerpo, url: d.url }),
          { TTL: 15 * 60, urgency: "high" },
        ),
    (d, exito) => sql`select privado.confirmar_entrega(${aviso}, ${d.suscripcion_id}, ${d.token_toma}, ${exito})`,
  );

  if (vencidas.length > 0) await sql`select privado.borrar_suscripciones_vencidas(${sql.array(vencidas)})`;
  return Response.json({ enviados, vencidas: vencidas.length, fallidos }, { status: fallidos ? 503 : 200 });
});
