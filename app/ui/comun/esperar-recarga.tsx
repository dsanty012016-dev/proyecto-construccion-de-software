"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

// Mientras Wompi confirma el pago, vuelve a pedir la página cada 3 segundos
// para que el resultado aparezca solo. Se rinde a los 3 minutos: de ahí en
// adelante la persona puede recargar la página o esperar la notificación.
const CADA = 3_000;
const INTENTOS = 60;

export function EsperarRecarga() {
  const router = useRouter();
  const [ronda, setRonda] = useState(0);
  const [terminada, setTerminada] = useState<number | null>(null);
  const [pendiente, consultar] = useTransition();
  useEffect(() => {
    let intentos = 0;
    const reloj = setInterval(() => {
      intentos += 1;
      router.refresh();
      if (intentos >= INTENTOS) { clearInterval(reloj); setTerminada(ronda); }
    }, CADA);
    return () => clearInterval(reloj);
  }, [router, ronda]);
  return <section aria-label="Consultar la recarga" className="space-y-3">
    <p role="status" className="text-sm text-texto-suave">
      {terminada === ronda
        ? "La confirmación está tardando más de lo habitual. La actualización automática terminó; puedes consultar de nuevo sin volver a pagar."
        : "Estamos consultando el estado automáticamente. No necesitas hacer otro pago."}
    </p>
    <button type="button" disabled={pendiente} onClick={() => {
      setRonda((valor) => valor + 1);
      consultar(() => router.refresh());
    }} className="min-h-12 w-full rounded-xl border border-texto-suave/30 px-4 font-semibold disabled:opacity-60">
      {pendiente ? "Consultando…" : "Consultar de nuevo"}
    </button>
  </section>;
}
