import type { Metadata } from "next";
import { destinoSeguro } from "@/app/lib/rutas";
import { Aviso } from "@/app/ui/auth/campos";
import { EncabezadoLogo, PieEnlace } from "@/app/ui/auth/encabezado";
import { FormularioEntrar } from "@/app/ui/auth/formulario-entrar";

export const metadata: Metadata = { title: "Iniciar sesión" };

// Pantalla "Iniciar sesión" (mockup Login).
export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ siguiente?: string; error?: string }>;
}) {
  const { siguiente, error } = await searchParams;

  return (
    <>
      <EncabezadoLogo titulo="¡Bienvenido!" subtitulo="Inicia sesión para continuar" />
      {error === "enlace" && (
        <div className="mb-4">
          <Aviso tipo="error">
            Ese enlace ya se usó o venció. Inicia sesión, o pide uno nuevo desde
            “¿Olvidaste tu contraseña?”.
          </Aviso>
        </div>
      )}
      <FormularioEntrar siguiente={siguiente ? destinoSeguro(siguiente) : undefined} />
      <PieEnlace texto="¿No tienes cuenta?" enlace="Regístrate" href="/registro" />
    </>
  );
}
