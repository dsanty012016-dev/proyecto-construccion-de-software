import type { Metadata } from "next";
import { destinoSeguro } from "@/app/lib/rutas";
import { Aviso } from "@/app/ui/auth/campos";
import { EncabezadoLogo, PieEnlace } from "@/app/ui/auth/encabezado";
import { FormularioEntrar } from "@/app/ui/auth/formulario-entrar";
import { ControlAperturaUniGo } from "@/app/ui/comun/apertura-unigo";
import Link from "next/link";

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
      <EncabezadoLogo titulo="Qué bueno verte." subtitulo="Entra con tu correo institucional." />
      {error === "enlace" && (
        <div className="mb-4">
          <Aviso tipo="info">
            Ese enlace ya se usó o venció. Si ya confirmaste tu cuenta, solo inicia sesión. Si querías cambiar tu contraseña, pide un
            enlace nuevo en “¿Olvidaste tu contraseña?”.
          </Aviso>
        </div>
      )}
      <FormularioEntrar siguiente={siguiente ? destinoSeguro(siguiente) : undefined} />
      <Link href="/confirmar-correo" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-secundario">Confirmar mi correo o pedir otro enlace</Link>
      <PieEnlace texto="¿No tienes cuenta?" enlace="Crear cuenta" href="/registro" />
      <ControlAperturaUniGo />
    </>
  );
}
