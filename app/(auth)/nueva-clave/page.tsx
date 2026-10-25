import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/app/lib/supabase/server";
import { EncabezadoVolver } from "@/app/ui/auth/encabezado";
import { FormularioNuevaClave } from "@/app/ui/auth/formularios-clave";

export const metadata: Metadata = { title: "Contraseña nueva" };

// Aquí llega quien abrió el enlace de recuperación (ya con sesión iniciada
// por /auth/confirmar). Sin sesión no hay a quién cambiarle la contraseña.
export default async function PaginaNuevaClave() {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/recuperar");

  return (
    <>
      <EncabezadoVolver
        titulo="Contraseña nueva"
        subtitulo="Escribe la contraseña que vas a usar desde ahora."
        volverA="/inicio"
      />
      <FormularioNuevaClave />
    </>
  );
}
