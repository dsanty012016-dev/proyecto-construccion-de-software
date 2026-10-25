"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// La página pública del viaje compartido no tiene sesión (no hay Realtime con
// RLS), así que vuelve a pedir los datos cada pocos segundos mientras se ve.
export function RefrescarCada({ segundos }: { segundos: number }) {
  const router = useRouter();
  useEffect(() => {
    const cada = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, segundos * 1000);
    return () => clearInterval(cada);
  }, [router, segundos]);
  return null;
}
