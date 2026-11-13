"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Mientras Wompi confirma el pago, vuelve a pedir la página cada 3 segundos
// para que el resultado aparezca solo. Se rinde a los 3 minutos: de ahí en
// adelante la persona puede recargar la página o esperar la notificación.
const CADA = 3_000;
const INTENTOS = 60;

export function EsperarRecarga() {
  const router = useRouter();
  useEffect(() => {
    let intentos = 0;
    const reloj = setInterval(() => {
      intentos += 1;
      if (intentos > INTENTOS) clearInterval(reloj);
      else router.refresh();
    }, CADA);
    return () => clearInterval(reloj);
  }, [router]);
  return null;
}
