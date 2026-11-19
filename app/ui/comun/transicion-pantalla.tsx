"use client";

import { usePathname } from "next/navigation";

export function TransicionPantalla({ children }: { children: React.ReactNode }) {
  const ruta = usePathname();
  return <div key={ruta} className="producto-pantalla">{children}</div>;
}
