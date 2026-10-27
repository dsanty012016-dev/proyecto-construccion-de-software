import type { Metadata } from "next";
import { usarEnlaceDeCorreo } from "@/app/lib/acciones-auth";
import { EncabezadoLogo } from "@/app/ui/auth/encabezado";
import { BotonEnviar } from "@/app/ui/auth/campos";

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
      <form action={usarEnlaceDeCorreo} className="mt-8 space-y-4">
        <input type="hidden" name="token_hash" value={token_hash ?? ""} />
        <input type="hidden" name="type" value={type ?? ""} />
        <input type="hidden" name="siguiente" value={siguiente ?? ""} />
        <BotonEnviar enviando="Un momento…">{recuperar ? "Continuar" : "Confirmar mi cuenta"}</BotonEnviar>
      </form>
    </>
  );
}
