import type { Metadata } from "next";
import { Cierre, Conducir, Equipo } from "@/app/ui/sitio/cierre";
import { Cuentas } from "@/app/ui/sitio/cuentas";
import { FranjaCiudad, Paradas } from "@/app/ui/sitio/paradas";
import { Portada } from "@/app/ui/sitio/portada";
import { Salidas } from "@/app/ui/sitio/salidas";

// Página pública de UniGo: el "cartel de ruta" (fase 17). Cuenta una sola
// historia: del "¿alguien va pa' la U?" del grupo de chat a la mañana de
// Laura, de Barzal a clase de siete. Todo es Server Component; lo único con
// JavaScript es el botón de modo claro u oscuro de la barra.
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
      <FranjaCiudad />
      <Salidas />
      <Cuentas />
      <Conducir />
      <Equipo />
      <Cierre />
    </>
  );
}
