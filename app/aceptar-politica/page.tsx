import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { politicaAlDia } from "@/app/lib/privacidad";
import { perfilActual } from "@/app/lib/sesion";
import { FormularioAceptarPolitica } from "@/app/ui/auth/formulario-aceptar-politica";

export const metadata: Metadata = { title: "Política de privacidad" };

// Para quien ya tenía cuenta (o aceptó una versión vieja): antes de seguir
// usando UniGo acepta la política vigente (Ley 1581). Está fuera de la zona
// privada para que el marco de la app no la vuelva a mandar aquí.
export default async function PaginaAceptarPolitica() {
  const { perfil } = await perfilActual();
  if (!perfil || politicaAlDia(perfil.politica_version)) redirect("/inicio");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      <Image src="/brand/logo-oscuro.png" alt="UniGo" width={97} height={34} className="h-[34px] w-auto self-start" priority />
      <div className="space-y-3">
        <h1 className="text-3xl tracking-tight">Antes de seguir</h1>
        <p className="leading-relaxed text-texto-suave">
          Publicamos la política de privacidad de UniGo. Cuenta qué datos guardamos (tu cuenta, tus viajes, la ubicación del conductor mientras
          viajan y, si conduces, tus documentos), quién los ve, con qué servicios los compartimos y cómo pedirnos que los borremos.
        </p>
      </div>
      <FormularioAceptarPolitica />
    </main>
  );
}
