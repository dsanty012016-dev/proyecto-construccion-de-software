"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
export function ActualizarEstado() {
  const router = useRouter();
  const [pendiente, actualizar] = useTransition();
  return <button type="button" disabled={pendiente} onClick={() => actualizar(() => router.refresh())} className="min-h-12 w-full rounded-xl border border-texto-suave/30 px-4 py-3 font-semibold disabled:opacity-60">{pendiente ? "Consultando…" : "Actualizar estado"}</button>;
}
