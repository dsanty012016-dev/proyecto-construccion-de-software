import type { Metadata } from "next";
import { EncabezadoVolver } from "@/app/ui/auth/encabezado";
import { FormularioConfirmacion } from "@/app/ui/auth/formulario-confirmacion";
export const metadata: Metadata = { title: "Confirmar correo" };
export default function PaginaConfirmarCorreo() {
  return <><EncabezadoVolver titulo="Confirma tu correo." subtitulo="Pide otro enlace si el anterior venció o no llegó." /><FormularioConfirmacion /></>;
}
