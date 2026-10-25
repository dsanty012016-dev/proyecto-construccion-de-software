"use client";

import { useActionState } from "react";
import { elegirRol } from "@/app/lib/acciones-auth";
import { ESTADO_INICIAL } from "@/app/lib/estado-formulario";
import { Aviso } from "./campos";

// Elegir con qué modo empezar (cuentas sin rol, por ejemplo si en el futuro
// se entra con Google o Microsoft). Después se cambia desde el perfil (009). Cada opción es un botón que envía el form.
export function SelectorRol() {
  const [estado, accion, enviando] = useActionState(elegirRol, ESTADO_INICIAL);

  return (
    <form action={accion} className="space-y-3">
      {estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}
      {[
        { valor: "estudiante", titulo: "Soy estudiante", texto: "Quiero pedir viajes a la universidad." },
        { valor: "conductor", titulo: "Soy conductor", texto: "Quiero llevar compañeros en mi carro o moto. Antes, el equipo revisa tus documentos." },
      ].map((opcion) => (
        <button
          key={opcion.valor}
          type="submit"
          name="rol"
          value={opcion.valor}
          disabled={enviando}
          className="block w-full rounded-2xl border border-texto-suave/25 bg-superficie p-5 text-left transition-colors hover:border-secundario disabled:opacity-70"
        >
          <span className="block font-titulo text-lg font-bold">{opcion.titulo}</span>
          <span className="mt-1 block text-sm text-texto-suave">{opcion.texto}</span>
        </button>
      ))}
      <p className="text-sm text-texto-suave">Después puedes cambiar de modo desde tu perfil.</p>
    </form>
  );
}
