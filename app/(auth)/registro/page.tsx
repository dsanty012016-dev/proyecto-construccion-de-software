import type { Metadata } from "next";
import { EncabezadoVolver, PieEnlace } from "@/app/ui/auth/encabezado";
import { FormularioRegistro } from "@/app/ui/auth/formulario-registro";
import Link from "next/link";

export const metadata: Metadata = { title: "Crear cuenta" };

// Pantalla "Crear cuenta" (mockup Registro).
export default function PaginaRegistro() {
  return (
    <>
      <EncabezadoVolver
        titulo="Crea tu cuenta."
        subtitulo="Solo necesitas tu correo institucional y un par de datos."
      />
      <FormularioRegistro />
      <Link href="/confirmar-correo" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-secundario">Ya me registré · confirmar mi correo</Link>
      <PieEnlace texto="¿Ya tienes cuenta?" enlace="Entrar" href="/entrar" />
    </>
  );
}
