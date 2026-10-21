"use client";

import Link from "next/link";
import { useActionState } from "react";
import { entrar } from "@/app/lib/acciones-auth";
import { ESTADO_INICIAL } from "@/app/lib/estado-formulario";
import { Aviso, BotonEnviar, Campo, CampoClave } from "./campos";
import { IconoCandado, IconoCorreo } from "./iconos-auth";

// Formulario de "Iniciar sesión" (mockup Login).
export function FormularioEntrar({ siguiente }: { siguiente?: string }) {
  const [estado, accion] = useActionState(entrar, ESTADO_INICIAL);
  const e = estado.errores ?? {};

  return (
    <form action={accion} noValidate className="space-y-4">
      {siguiente && <input type="hidden" name="siguiente" value={siguiente} />}
      {estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}

      <Campo
        etiqueta="Correo institucional"
        name="correo"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="tu.nombre@ustavillavo.edu.co"
        defaultValue={estado.valores?.correo}
        error={e.correo}
        icono={<IconoCorreo />}
        required
      />
      <div>
        <CampoClave
          etiqueta="Contraseña"
          name="clave"
          autoComplete="current-password"
          error={e.clave}
          icono={<IconoCandado />}
          required
        />
        <div className="mt-1 flex justify-end">
          <Link href="/recuperar" className="inline-flex min-h-11 items-center text-sm">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </div>

      <BotonEnviar enviando="Entrando…">Iniciar sesión</BotonEnviar>
    </form>
  );
}
