import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { perfilActual } from "@/app/lib/sesion";
import { SelectorRol } from "@/app/ui/auth/selector-rol";

export const metadata: Metadata = { title: "¿Cómo vas a usar UniGo?" };

// Para cuentas que aún no tienen rol. Con rol, no hay nada que elegir.
export default async function PaginaElegirRol() {
  const { perfil } = await perfilActual();
  if (perfil?.rol) redirect("/inicio");

  return (
    <main>
      <h1 className="text-3xl tracking-tight">¿Cómo vas a usar UniGo?</h1>
      <p className="mt-2 mb-8 text-texto-suave">
        Hola{perfil ? `, ${perfil.nombre.split(" ")[0]}` : ""}. Elige una opción para terminar tu cuenta.
      </p>
      <SelectorRol />
    </main>
  );
}
