import type { Metadata } from "next";
import { EncabezadoVolver, PieEnlace } from "@/app/ui/auth/encabezado";
import { FormularioRegistro } from "@/app/ui/auth/formulario-registro";

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
      <PieEnlace texto="¿Ya tienes cuenta?" enlace="Entrar" href="/entrar" />
    </>
  );
}
