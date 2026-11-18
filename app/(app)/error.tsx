"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

// Si una pantalla de la app falla (por ejemplo, sin conexión con la base),
// se dice qué pasó en palabras simples y se ofrece reintentar, en vez de la
// pantalla de error genérica. El detalle queda en la consola para el equipo.
export default function ErrorDeLaApp({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const ruta = usePathname();
  const router = useRouter();
  const [pendiente, reintentar] = useTransition();
  const contexto = ruta.includes("/documentos") ? "tus documentos"
    : ruta.includes("/cupos") || ruta.includes("/cupo") ? "los datos del cupo"
    : ruta.startsWith("/billetera") ? "tu billetera"
    : ruta.startsWith("/viajes") ? "tus viajes"
    : ruta.includes("/viaje") ? "tu viaje"
    : "los datos de esta pantalla";
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70dvh] flex-col justify-center gap-5 px-5 text-center">
      <h1 className="cartel text-[2.125rem] [overflow-wrap:anywhere]">No pudimos consultar {contexto}</h1>
      <p role="alert" className="text-texto-suave">Revisa tu conexión y vuelve a consultar. No pudimos comprobar la información; un fallo de conexión no significa que esté vacía.</p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={pendiente}
          onClick={() => reintentar(() => { router.refresh(); reset(); })}
          className="min-h-12 rounded-xl bg-primario prensa px-4 py-3 font-titulo font-semibold text-sobre-primario hover:bg-primario/85 disabled:opacity-60"
        >
          {pendiente ? "Consultando…" : "Intentar de nuevo"}
        </button>
        <Link href="/inicio" className="flex min-h-12 items-center justify-center rounded-xl border border-texto-suave/30 font-semibold text-texto hover:bg-superficie">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
