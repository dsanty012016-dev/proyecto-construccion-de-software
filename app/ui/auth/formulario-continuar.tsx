"use client";

import { useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import { usarEnlaceDeCorreo } from "@/app/lib/acciones-auth";

// El botón de /continuar. El enlace del correo sirve una sola vez, así que el
// botón no se puede tocar dos veces: queda apagado hasta que la página termina
// de cargar (antes, cada toque mandaba el formulario otra vez y el navegador
// se quedaba con el último intento, ya gastado) y mientras se valida.

const sinCambios = () => () => {};

function Boton({ listo, texto }: { listo: boolean; texto: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={!listo || pending}
      className="flex h-12 w-full items-center justify-center rounded-xl bg-primario font-titulo font-semibold text-texto transition-colors hover:bg-primario/85 disabled:opacity-70"
    >
      {!listo ? "Cargando…" : pending ? "Un momento…" : texto}
    </button>
  );
}

export function FormularioContinuar({
  tokenHash,
  tipo,
  siguiente,
  texto,
}: {
  tokenHash: string;
  tipo: string;
  siguiente: string;
  texto: string;
}) {
  // true en el navegador ya cargado; false mientras llega del servidor.
  const listo = useSyncExternalStore(sinCambios, () => true, () => false);
  return (
    <form action={usarEnlaceDeCorreo} className="mt-8 space-y-4">
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={tipo} />
      <input type="hidden" name="siguiente" value={siguiente} />
      <Boton listo={listo} texto={texto} />
    </form>
  );
}
