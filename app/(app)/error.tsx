"use client";

import Link from "next/link";
import { useEffect } from "react";

// Si una pantalla de la app falla (por ejemplo, sin conexión con la base),
// se dice qué pasó en palabras simples y se ofrece reintentar, en vez de la
// pantalla de error genérica. El detalle queda en la consola para el equipo.
export default function ErrorDeLaApp({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70dvh] flex-col justify-center gap-5 px-5 text-center">
      <h1 className="text-2xl tracking-tight">No pudimos cargar esta pantalla</h1>
      <p className="text-texto-suave">Revisa tu conexión e inténtalo de nuevo. Si sigue pasando, avísale al equipo de UniGo.</p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={reset}
          className="min-h-12 rounded-xl bg-primario font-titulo font-semibold text-texto hover:bg-primario/85"
        >
          Intentar de nuevo
        </button>
        <Link href="/inicio" className="flex min-h-12 items-center justify-center rounded-xl border border-texto-suave/30 font-semibold text-texto hover:bg-superficie">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
