"use client";
import { useActionState, useId, useState } from "react";
import { revisarRetiro } from "@/app/lib/acciones-retiros";
import { ESTADO_INICIAL } from "@/app/lib/estado-formulario";
import { Aviso, BotonEnviar, Campo } from "@/app/ui/auth/campos";

export function FormularioRevisarRetiro({ retiroId, simulado, documentoDisponible }: { retiroId: string; simulado: boolean; documentoDisponible: boolean }) {
  const [estado, accion] = useActionState(revisarRetiro, ESTADO_INICIAL);
  const [resultado, setResultado] = useState(documentoDisponible ? "pagado" : "rechazado");
  const id = useId();
  if (estado.resultado === "listo") return <Aviso tipo="listo">{estado.mensaje}</Aviso>;
  return <form action={accion} noValidate className="space-y-3">
    <input type="hidden" name="retiro" value={retiroId} />
    {estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}
    <label htmlFor={`${id}-resultado`} className="block text-sm font-semibold">Resultado de la revisión</label>
    <select id={`${id}-resultado`} name="resultado" value={resultado} onChange={(evento) => setResultado(evento.target.value)} className="min-h-12 w-full rounded-xl border border-texto-suave/50 bg-superficie px-3 text-texto">
      <option value="pagado" disabled={!documentoDisponible}>{simulado ? "Registrar pago de prueba" : "Registrar pago ya realizado"}</option>
      <option value="rechazado">Rechazar y devolver a la billetera</option>
    </select>
    {resultado === "pagado" ? <>
      <div className="flex items-start gap-3">
        <input id={`${id}-documentos`} type="checkbox" name="documentos" className="mt-1 size-5 shrink-0 accent-primario" aria-describedby={estado.errores?.documentos ? `${id}-error` : undefined} />
        <label htmlFor={`${id}-documentos`} className="min-h-11 text-sm">Revisé la cédula y la documentación del conductor y comprobé que es titular del Nequi indicado.</label>
      </div>
      {estado.errores?.documentos && <p id={`${id}-error`} role="alert" className="text-sm text-error">{estado.errores.documentos}</p>}
      <Campo etiqueta={simulado ? "Referencia de prueba" : "Referencia del pago en Nequi"} name="referencia" autoComplete="off" error={estado.errores?.referencia} required />
      <p className="text-sm text-texto-suave">{simulado ? "Esta operación es simulada: no hagas una transferencia real." : "Primero realiza el pago en Nequi. UniGo guarda la referencia y la revisión; este botón no transfiere dinero."}</p>
    </> : <Campo etiqueta="Motivo del rechazo" name="motivo" maxLength={300} error={estado.errores?.motivo} required />}
    <BotonEnviar enviando="Guardando…">{resultado === "pagado" ? "Guardar pago registrado" : "Confirmar rechazo"}</BotonEnviar>
  </form>;
}
