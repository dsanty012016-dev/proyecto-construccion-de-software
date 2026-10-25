"use client";

import { useActionState } from "react";
import { guardarNuevaClave, recuperarClave } from "@/app/lib/acciones-auth";
import { ESTADO_INICIAL } from "@/app/lib/estado-formulario";
import { LARGO_MINIMO_CLAVE } from "@/app/lib/validaciones-auth";
import { Aviso, BotonEnviar, Campo, CampoClave } from "./campos";
import { IconoCorreo } from "./iconos-auth";

// Formularios para recuperar la contraseña: pedir el enlace y, al volver del
// correo, escribir la contraseña nueva.

export function FormularioRecuperar() {
  const [estado, accion] = useActionState(recuperarClave, ESTADO_INICIAL);

  if (estado.resultado === "listo") {
    return <Aviso tipo="listo">{estado.mensaje}</Aviso>;
  }

  return (
    <form action={accion} noValidate className="space-y-4">
      {estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}
      <Campo
        etiqueta="Correo institucional"
        name="correo"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="tu.nombre@ustavillavo.edu.co"
        defaultValue={estado.valores?.correo}
        error={estado.errores?.correo}
        icono={<IconoCorreo />}
        required
      />
      <BotonEnviar enviando="Enviando…">Enviar enlace</BotonEnviar>
    </form>
  );
}

export function FormularioNuevaClave() {
  const [estado, accion] = useActionState(guardarNuevaClave, ESTADO_INICIAL);
  const e = estado.errores ?? {};

  return (
    <form action={accion} noValidate className="space-y-4">
      {estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}
      <CampoClave
        etiqueta="Contraseña nueva"
        name="clave"
        autoComplete="new-password"
        placeholder={`Mínimo ${LARGO_MINIMO_CLAVE} caracteres, con letras y números`}
        error={e.clave}
        required
      />
      <CampoClave
        etiqueta="Confirmar contraseña"
        name="confirmacion"
        autoComplete="new-password"
        error={e.confirmacion}
        required
      />
      <BotonEnviar enviando="Guardando…">Guardar contraseña</BotonEnviar>
    </form>
  );
}
