"use server";

import { z } from "zod";
import {
  historialParaIA,
  instruccionesDelSistema,
  interpretarRespuestaIA,
  MAX_LARGO_MENSAJE,
  MAX_MENSAJES_HISTORIAL,
  respuestaDeGuion,
  type MensajeAsistente,
  type RespuestaAsistente,
  type RolAsistente,
} from "./asistente";
import { crearClienteServidor } from "./supabase/server";

// Server Action del asistente Uni. Responde con Gemini (API de Google AI
// Studio) y, si no hay clave, se acabó el cupo del día de la persona (034) o
// la IA tarda o responde mal, con el guion propio de app/lib/asistente.ts.
// A Gemini solo le llegan el rol, la hora y los mensajes del chat: ni nombre,
// ni correo, ni teléfono, ni ubicación.

const MODELO_POR_DEFECTO = "gemini-3.5-flash-lite";
const ESPERA_MAXIMA_MS = 9000;

const esquemaHistorial = z
  .array(z.object({ de: z.enum(["persona", "asistente"]), texto: z.string().trim().min(1).max(MAX_LARGO_MENSAJE * 2) }))
  .min(1)
  .max(MAX_MENSAJES_HISTORIAL * 3)
  .refine((h) => h[h.length - 1].de === "persona", "El último mensaje es de la persona.");

export type RespuestaDelAsistente = RespuestaAsistente & { fuente: "ia" | "guion" };

export async function preguntarAlAsistente(historialCrudo: MensajeAsistente[]): Promise<RespuestaDelAsistente> {
  const validado = esquemaHistorial.safeParse(historialCrudo);
  if (!validado.success) {
    return { texto: "Ese mensaje no me llegó bien. ¿Me lo repites más corto?", acciones: [], fuente: "guion" };
  }
  const historial = validado.data;
  const ultimo = historial[historial.length - 1].texto.slice(0, MAX_LARGO_MENSAJE);

  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return { texto: "Tienes que entrar a tu cuenta para hablar conmigo.", acciones: [], fuente: "guion" };

  // RLS: cada quien solo lee su propio perfil.
  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", id).single();
  const rol: RolAsistente = perfil?.rol === "conductor" ? "conductor" : "estudiante";
  const ahora = new Date();
  const guion = (): RespuestaDelAsistente => ({ ...respuestaDeGuion(ultimo, { rol, ahora, azar: Math.random() }), fuente: "guion" });

  const clave = process.env.GEMINI_API_KEY;
  if (!clave) return guion();

  // Cupo diario por persona (034). Si la función no está o falla, se usa el guion.
  const { data: permitido, error: errorCupo } = await supabase.rpc("usar_asistente");
  if (errorCupo || permitido !== true) return guion();

  try {
    const modelo = process.env.GEMINI_MODELO || MODELO_POR_DEFECTO;
    const respuesta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": clave },
      signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
      cache: "no-store",
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instruccionesDelSistema(rol, ahora) }] },
        contents: historialParaIA(historial).map((m) => ({ role: m.de === "persona" ? "user" : "model", parts: [{ text: m.texto }] })),
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 400,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: { texto: { type: "STRING" }, destinos: { type: "ARRAY", items: { type: "STRING" } } },
            required: ["texto", "destinos"],
          },
        },
      }),
    });
    if (!respuesta.ok) return guion();
    const cuerpo = (await respuesta.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const texto = cuerpo.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    const interpretada = interpretarRespuestaIA(JSON.parse(texto), rol);
    return interpretada ? { ...interpretada, fuente: "ia" } : guion();
  } catch {
    return guion();
  }
}
