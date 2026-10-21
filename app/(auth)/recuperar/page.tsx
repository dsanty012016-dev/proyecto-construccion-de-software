import type { Metadata } from "next";
import { EncabezadoVolver, PieEnlace } from "@/app/ui/auth/encabezado";
import { FormularioRecuperar } from "@/app/ui/auth/formularios-clave";

export const metadata: Metadata = { title: "Recuperar contraseña" };

// Pantalla "Recuperar contraseña" (mockup): envía un enlace al correo.
export default function PaginaRecuperar() {
  return (
    <>
      <EncabezadoVolver
        titulo="Recuperar contraseña"
        subtitulo="Escribe tu correo institucional y te enviaremos un enlace para crear una contraseña nueva."
      />
      <FormularioRecuperar />
      <PieEnlace texto="¿Recordaste tu contraseña?" enlace="Inicia sesión" href="/entrar" />
    </>
  );
}
