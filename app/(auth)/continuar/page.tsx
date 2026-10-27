import type { Metadata } from "next";
import { EncabezadoLogo } from "@/app/ui/auth/encabezado";
import { FormularioContinuar } from "@/app/ui/auth/formulario-continuar";

export const metadata: Metadata = { title: "Continuar", robots: { index: false } };

// Llega desde el enlace de un correo (confirmar cuenta o recuperar contraseña).
// El enlace solo sirve una vez y Outlook y otros correos lo "abren" solos para
// revisarlo, así que se usa recién cuando la persona toca el botón.
export default async function PaginaContinuar({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; siguiente?: string }>;
}) {
  const { token_hash, type, siguiente } = await searchParams;
  const recuperar = type === "recovery";

  return (
    <>
      <EncabezadoLogo
        titulo={recuperar ? "Crea tu contraseña nueva" : "Confirma tu cuenta"}
        subtitulo={recuperar ? "Toca el botón para seguir y escribir tu contraseña nueva." : "Toca el botón para confirmar tu correo institucional."}
      />
      <FormularioContinuar
        tokenHash={token_hash ?? ""}
        tipo={type ?? ""}
        siguiente={siguiente ?? ""}
        texto={recuperar ? "Continuar" : "Confirmar mi cuenta"}
      />
    </>
  );
}
