import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { solicitudParaOfertar, viajeActivoDelConductor } from "@/app/lib/consultas-viaje";
import { nombreCorto } from "@/app/lib/formato";
import { exigirRol } from "@/app/lib/sesion";
import { EncabezadoPantalla } from "@/app/ui/comun/encabezado-pantalla";
import { Mapa } from "@/app/ui/comun/mapa";
import { RutaViaje } from "@/app/ui/comun/ruta-viaje";
import { FormularioOferta } from "@/app/ui/conductor/formulario-oferta";

export const metadata: Metadata = { title: "Ofertar" };

// Ofertar (rediseño): a quién, por dónde y, sobre todo, el precio con lo que
// recibe después de la comisión.
export default async function PaginaOfertar({ params }: { params: Promise<{ viaje: string }> }) {
  const { usuario } = await exigirRol("conductor");
  const { viaje: viajeId } = await params;
  if (await viajeActivoDelConductor(usuario.id)) redirect("/conductor/viaje");

  // Si la solicitud ya no existe (la cancelaron o la tomó otro), se vuelve al inicio.
  const solicitud = await solicitudParaOfertar(viajeId, usuario.id);
  if (!solicitud) redirect("/conductor");
  const { viaje, estudiante, miOferta } = solicitud;
  const origen = { lat: viaje.origen_lat, lng: viaje.origen_lng };
  const destino = { lat: viaje.destino_lat, lng: viaje.destino_lng };

  return (
    <main className="space-y-6 px-5 pt-4">
      <EncabezadoPantalla
        titulo={`${miOferta ? "Cambiar oferta a" : "Ofertar a"} ${estudiante ? nombreCorto(estudiante.nombre) : "un estudiante"}`}
        texto="Solicitud de viaje a la U"
        volverA="/conductor"
      />
      <RutaViaje origen={viaje.origen_texto} destino={viaje.destino_texto} etiquetaOrigen="Recoges en" etiquetaDestino="Llevas a" />
      <Mapa etiqueta="Mapa de la solicitud" centro={origen} origen={origen} destino={destino} className="h-40" />
      <FormularioOferta viajeId={viaje.id} precioActual={miOferta?.precio} />
    </main>
  );
}
