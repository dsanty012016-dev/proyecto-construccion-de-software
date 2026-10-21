import type { Metadata } from "next";
import { Equipo } from "@/app/ui/sitio/equipo";
import { Mosaicos } from "@/app/ui/sitio/mosaicos";
import { Pasos } from "@/app/ui/sitio/pasos";
import { Unete } from "@/app/ui/sitio/pie-sitio";
import { Portada } from "@/app/ui/sitio/portada";
import { Roles } from "@/app/ui/sitio/roles";
import { Seguridad } from "@/app/ui/sitio/seguridad";

// Página pública de UniGo (la "landing"). Todo es Server Component salvo la
// escena 3D de la portada, que se carga en el navegador.
export const metadata: Metadata = {
  title: { absolute: "UniGo: tu viaje, tu universidad" },
  description:
    "Viajes a la Universidad Santo Tomás de Villavicencio con conductores que también estudian allí. Tú escoges la oferta.",
};

export default function PaginaInicio() {
  return (
    <>
      <Portada />
      <Roles />
      <Mosaicos />
      <Pasos />
      <Seguridad />
      <Equipo />
      <Unete />
    </>
  );
}
