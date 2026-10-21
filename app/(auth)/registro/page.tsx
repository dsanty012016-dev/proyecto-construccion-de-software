import type { Metadata } from "next";
import { EncabezadoVolver, PieEnlace } from "@/app/ui/auth/encabezado";
import { FormularioRegistro } from "@/app/ui/auth/formulario-registro";

export const metadata: Metadata = { title: "Crear cuenta" };

// Pantalla "Crear cuenta" (mockup Registro).
export default function PaginaRegistro() {
  return (
    <>
      <EncabezadoVolver
        titulo="Crear cuenta"
        subtitulo="Únete a UniGo y viaja de forma segura con tu universidad."
      />
      <FormularioRegistro />
      <PieEnlace texto="¿Ya tienes cuenta?" enlace="Inicia sesión" href="/entrar" />
    </>
  );
}
