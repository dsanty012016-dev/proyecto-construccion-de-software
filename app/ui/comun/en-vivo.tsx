"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { type Escucha, useCambiosEnVivo } from "@/app/lib/viaje-online";

// Mantiene la pantalla al día: con cada cambio en tiempo real vuelve a pedir
// los datos al servidor. Por si Realtime falla (red, permisos), también
// refresca cada cierto tiempo mientras la pestaña está visible.
export function EnVivo({ escuchas, respaldoSegundos = 30 }: { escuchas: Escucha[]; respaldoSegundos?: number }) {
  const router = useRouter();
  useCambiosEnVivo(escuchas, () => router.refresh());

  useEffect(() => {
    const cada = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, respaldoSegundos * 1000);
    const alVolver = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(cada);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [router, respaldoSegundos]);

  return null;
}
