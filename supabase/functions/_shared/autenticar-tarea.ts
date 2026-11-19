import { createHash, timingSafeEqual } from "node:crypto";

export async function autenticarTarea(peticion: Request, obtenerHash: () => Promise<string | null>): Promise<boolean> {
  const recibido = peticion.headers.get("x-unigo-tareas");
  if (!recibido || !/^[A-Za-z0-9_-]{32,128}$/.test(recibido)) return false;
  const autorizado = await obtenerHash();
  if (!autorizado || !/^[a-f0-9]{64}$/.test(autorizado)) return false;
  const entrada = createHash("sha256").update(recibido).digest("hex");
  const texto = new TextEncoder();
  return timingSafeEqual(texto.encode(entrada), texto.encode(autorizado));
}
