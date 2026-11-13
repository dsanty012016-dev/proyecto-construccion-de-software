// Enviar y confirmar son pasos distintos: solo se reintenta el celular que
// falló. Si se pierde la confirmación, la reserva caduca y puede haber un
// duplicado; no se promete entrega exactamente una vez a través de la red.
export interface Entrega {
  titulo: string;
  cuerpo: string;
  url: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  suscripcion_id: string;
  token_toma: string;
}

export async function enviarEntregas(
  destinos: Entrega[],
  enviar: (destino: Entrega) => Promise<unknown>,
  confirmar: (destino: Entrega, exito: boolean) => Promise<unknown>,
) {
  const vencidas: string[] = [];
  let enviados = 0;
  let fallidos = 0;
  await Promise.all(destinos.map(async (destino) => {
    let exito = false;
    let vencida = false;
    try {
      await enviar(destino);
      exito = true;
    } catch (error) {
      const codigo = (error as { statusCode?: number })?.statusCode;
      vencida = codigo === 404 || codigo === 410;
    }
    try {
      // Una suscripción vencida se da por procesada, sin volver a enviarla.
      await confirmar(destino, exito || vencida);
      if (exito) enviados++;
      else if (vencida) vencidas.push(destino.endpoint);
      else fallidos++;
    } catch {
      // La reserva queda pendiente hasta caducar; no se marca el aviso enviado.
      fallidos++;
    }
  }));
  return { enviados, vencidas, fallidos };
}
