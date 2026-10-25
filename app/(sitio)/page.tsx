import type { Metadata } from "next";
import { Cierre, Conducir, Equipo } from "@/app/ui/sitio/cierre";
import { Paradas } from "@/app/ui/sitio/paradas";
import { Portada } from "@/app/ui/sitio/portada";
import { Precios, Seguridad } from "@/app/ui/sitio/garantias";
import { Salidas } from "@/app/ui/sitio/salidas";

// Página pública de UniGo (rediseño con la skill impeccable, lienzo
// "UniGo · Landing (impeccable)"). Cuenta una sola historia: del "¿alguien va
// pa' la U?" del grupo de chat a la ruta del barrio a la universidad.
// Todo es Server Component salvo la escena 3D de la portada.
export const metadata: Metadata = {
  title: { absolute: "UniGo: tu viaje, tu universidad" },
  description:
    "Viajes a la Universidad Santo Tomás de Villavicencio con conductores que también estudian allí. Ellos te ofrecen su precio y tú eliges.",
};

export default function PaginaInicio() {
  return (
    <>
      <Portada />
      <Paradas />
      <Salidas />
      <Seguridad />
      <Precios />
      <Conducir />
      <Equipo />
      <Cierre />
    </>
  );
}
