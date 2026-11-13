"use client";

import { useActionState } from "react";
import { salir } from "@/app/lib/acciones-auth";
import { enOrdenAvisos, formularioDeSalida } from "@/app/lib/avisos-navegador";
import { ESTADO_INICIAL, type EstadoFormulario } from "@/app/lib/estado-formulario";

// El navegador identifica su suscripción; el servidor la quita antes de
// cerrar sesión. Si falla, se permite reintentar sin dejar avisos de otra cuenta.
async function cerrarSesion(anterior: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  return enOrdenAvisos(async () => {
    let datos: FormData;
    try {
      datos = await formularioDeSalida(formulario);
    } catch {
      return { resultado: "error", mensaje: "No pudimos comprobar las notificaciones de este celular. Intenta cerrar sesión de nuevo." };
    }
    return salir(anterior, datos);
  });
}

export function BotonSalir() {
  const [estado, accion, pendiente] = useActionState(cerrarSesion, ESTADO_INICIAL);
  return (
    <form action={accion}>
      <button type="submit" disabled={pendiente} className="min-h-12 w-full rounded-xl text-sm font-semibold text-texto-suave hover:text-texto disabled:opacity-70">
        {pendiente ? "Cerrando sesión…" : "Cerrar sesión"}
      </button>
      {estado.resultado === "error" && <p role="alert" className="mt-2 text-center text-sm text-error">{estado.mensaje}</p>}
    </form>
  );
}
