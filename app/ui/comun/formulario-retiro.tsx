"use client";
import { useActionState } from "react";
import { solicitarRetiro } from "@/app/lib/acciones-retiros";
import { ESTADO_INICIAL } from "@/app/lib/estado-formulario";
import { pesos } from "@/app/lib/formato";
import { RETIRO_MINIMO } from "@/app/lib/retiros";
import { Aviso, BotonEnviar, Campo } from "@/app/ui/auth/campos";

export function FormularioRetiro({ disponible, simulado }: { disponible: number; simulado: boolean }) {
  const [estado, accion] = useActionState(solicitarRetiro, ESTADO_INICIAL);
  if (disponible < RETIRO_MINIMO) return <p className="text-sm text-texto-suave">Puedes solicitar un retiro cuando tengas al menos {pesos(RETIRO_MINIMO)} de ganancias disponibles.</p>;
  return <form action={accion} noValidate className="space-y-4">
    {estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}
    <Campo etiqueta="Monto a retirar" name="monto" inputMode="numeric" autoComplete="off" defaultValue={estado.valores?.monto ?? String(RETIRO_MINIMO)} error={estado.errores?.monto} required />
    <p className="text-sm text-texto-suave">Desde {pesos(RETIRO_MINIMO)} hasta {pesos(disponible)}. El dinero quedará apartado mientras revisamos tu solicitud.</p>
    <Campo etiqueta="Tu número de Nequi" name="nequi" type="tel" inputMode="tel" autoComplete="tel-national" defaultValue={estado.valores?.nequi} error={estado.errores?.nequi} required />
    <p className="text-sm text-texto-suave">Debe estar a tu nombre. Los administradores revisarán tu cédula y la titularidad antes de registrar el pago. Plazo máximo: siete días desde la solicitud.</p>
    {simulado && <Aviso tipo="info">Este es un retiro de prueba. No se transferirá dinero real a Nequi.</Aviso>}
    <BotonEnviar enviando="Solicitando…">{simulado ? "Solicitar retiro de prueba" : "Solicitar retiro"}</BotonEnviar>
  </form>;
}
