"use client";
import { useActionState } from "react";
import { actualizarContacto } from "@/app/lib/acciones-perfil";
import { ESTADO_INICIAL } from "@/app/lib/estado-formulario";
import { Aviso, BotonEnviar, Campo, ResumenErrores } from "@/app/ui/auth/campos";

export function FormularioContacto({ nombre, telefono }: { nombre: string; telefono: string | null }) {
  const [estado, accion] = useActionState(actualizarContacto, ESTADO_INICIAL);
  return <form action={accion} className="space-y-4 pt-3" noValidate>
    <p className="text-sm text-texto-suave">Usa tu nombre completo como aparece en tu documento y un celular donde puedan contactarte durante el viaje. Tu correo institucional se mantiene.</p>
    <ResumenErrores estado={estado} />
    {estado.resultado === "listo" && <Aviso tipo="listo">{estado.mensaje}</Aviso>}
    <Campo etiqueta="Nombre completo" name="nombre" autoComplete="name" maxLength={80} defaultValue={estado.valores?.nombre ?? nombre} error={estado.errores?.nombre} required />
    <Campo etiqueta="Celular (+57)" name="telefono" type="tel" inputMode="tel" autoComplete="tel-national" maxLength={20} defaultValue={estado.valores?.telefono ?? telefono?.replace(/^\+57/, "") ?? ""} error={estado.errores?.telefono} required />
    <BotonEnviar enviando="Guardando…">Guardar nombre y celular</BotonEnviar>
  </form>;
}
