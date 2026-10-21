"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Vuelve a pedir los datos de la pantalla cada tantos segundos mientras está
// visible. Es la forma sencilla de ver ofertas nuevas en la fase 3; en la fase 4
// se reemplaza por Realtime de Supabase.
export function ActualizarCada({ segundos = 5 }: { segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    const cada = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, segundos * 1000);
    return () => clearInterval(cada);
  }, [router, segundos]);
  return null;
}
