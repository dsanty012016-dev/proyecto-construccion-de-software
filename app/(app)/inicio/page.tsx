import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { inicioDeRol, perfilActual } from "@/app/lib/sesion";

export const metadata: Metadata = { title: "Inicio" };

// Punto de entrada después de iniciar sesión: manda a cada quien a su inicio
// (estudiante o conductor). Conserva el aviso de "contraseña actualizada".
export default async function PaginaInicio({
  searchParams,
}: {
  searchParams: Promise<{ clave?: string }>;
}) {
  const { perfil } = await perfilActual();
  const { clave } = await searchParams;
  const destino = inicioDeRol(perfil?.rol);
  redirect(clave === "actualizada" && perfil?.rol ? `${destino}?clave=actualizada` : destino);
}
