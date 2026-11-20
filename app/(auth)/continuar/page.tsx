import type { Metadata } from "next";
import { EncabezadoLogo } from "@/app/ui/auth/encabezado";
import { FormularioContinuar } from "@/app/ui/auth/formulario-continuar";
import { FormularioClaveConEnlace } from "@/app/ui/auth/formularios-clave";

export const metadata: Metadata = { title: "Continuar", robots: { index: false } };

// Llega desde el enlace de un correo (confirmar cuenta o recuperar contraseña).
// El enlace solo sirve una vez y Outlook y otros correos lo "abren" solos para
// revisarlo. Para confirmar la cuenta se usa al tocar el botón; para recuperar
// la contraseña, recién al guardar la nueva (los revisores llegan a tocar
// botones, pero no escriben contraseñas).
export default async function PaginaContinuar({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; siguiente?: string }>;
}) {
  const { token_hash, type, siguiente } = await searchParams;
  const recuperar = type === "recovery";

  if (recuperar) {
    return (
      <>
        <EncabezadoLogo titulo="Crea tu contraseña nueva" subtitulo="Escribe la contraseña que vas a usar desde ahora." />
        <FormularioClaveConEnlace tokenHash={token_hash ?? ""} />
      </>
    );
  }

  return (
    <>
      <EncabezadoLogo
        titulo="Confirma tu cuenta"
        subtitulo="Toca el botón para confirmar tu correo institucional."
      />
      <FormularioContinuar
        tokenHash={token_hash ?? ""}
        tipo={type ?? ""}
        siguiente={siguiente ?? ""}
        texto="Confirmar mi cuenta"
      />
    </>
  );
}
