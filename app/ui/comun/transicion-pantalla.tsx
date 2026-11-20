"use client";

import { usePathname } from "next/navigation";

function movimientoEn(ruta: string) {
  if (ruta === "/estudiante" || ruta === "/conductor") return "inicio";
  if (/^\/(?:estudiante\/cupos|conductor\/cupo)(?:\/|$)/.test(ruta)) return "cupos";
  if (/^\/(?:estudiante|conductor)\/(?:viaje|pedir|ofertar)(?:\/|$)/.test(ruta)) return "trayecto";
  if (/^\/billetera(?:\/|$)/.test(ruta)) return "saldo";
  if (/^\/viajes(?:\/|$)/.test(ruta)) return "historial";
  if (/^\/(?:perfil|conductor\/(?:documentos|vehiculo))(?:\/|$)/.test(ruta)) return "identidad";
  if (/^\/admin(?:\/|$)/.test(ruta)) return "control";
  return "acceso";
}

export function TransicionPantalla({ children }: { children: React.ReactNode }) {
  const ruta = usePathname();
  return <div key={ruta} className="producto-pantalla" data-movimiento={movimientoEn(ruta)}>{children}</div>;
}
