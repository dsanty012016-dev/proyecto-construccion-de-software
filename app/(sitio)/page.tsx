import type { Metadata } from "next";
import { Cierre, Conducir } from "@/app/ui/sitio/cierre";
import { Cuentas, Leyenda } from "@/app/ui/sitio/cuentas";
import { Paradas } from "@/app/ui/sitio/paradas";
import { PlanoPortada } from "@/app/ui/sitio/plano-portada";
import { Portada } from "@/app/ui/sitio/portada";
import { Salidas } from "@/app/ui/sitio/salidas";

// Página pública de UniGo: "el mapa es la página". El plano real de
// Villavicencio queda detrás y cada sección es un rótulo que lo recorre: la
// ruta desde tu barrio, la mañana de Laura, la leyenda de seguridad, la escala
// de precios, los cupos y el cajetín con el equipo. Las secciones son Server
// Components; el plano y el selector de barrio son lo único con JavaScript
// (además del botón de modo claro u oscuro de la barra).
export const metadata: Metadata = {
  title: { absolute: "UniGo: tu viaje, tu universidad" },
  description:
    "Viajes a la Universidad Santo Tomás de Villavicencio con conductores que también estudian allí. Ellos te ofrecen su precio y tú eliges.",
};

export default function PaginaInicio() {
  return (
    <>
      <PlanoPortada />
      <Portada />
      <Paradas />
      <Leyenda />
      <Cuentas />
      <Salidas />
      <Conducir />
      <Cierre />
    </>
  );
}
