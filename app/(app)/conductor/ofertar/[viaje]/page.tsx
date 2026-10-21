import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { solicitudParaOfertar, viajeActivoDelConductor } from "@/app/lib/consultas-viaje";
import { nombreCorto } from "@/app/lib/formato";
import { distanciaKm, distanciaTexto } from "@/app/lib/mapa";
import { exigirRol } from "@/app/lib/sesion";
import { Avatar } from "@/app/ui/comun/avatar";
import { EncabezadoPantalla } from "@/app/ui/comun/encabezado-pantalla";
import { Mapa } from "@/app/ui/comun/mapa";
import { RutaViaje } from "@/app/ui/comun/ruta-viaje";
import { FormularioOferta } from "@/app/ui/conductor/formulario-oferta";

export const metadata: Metadata = { title: "Ofertar" };

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
    <main className="space-y-6 px-5 pt-6">
      <EncabezadoPantalla titulo={miOferta ? "Cambiar tu oferta" : "Nueva solicitud"} volverA="/conductor" />
      <section aria-label="Solicitud" className="space-y-4 rounded-2xl bg-superficie p-4">
        <div className="flex items-center gap-3">
          <Avatar nombre={estudiante?.nombre ?? "Estudiante"} />
          <p className="font-bold">{estudiante ? nombreCorto(estudiante.nombre) : "Estudiante"}</p>
        </div>
        <RutaViaje origen={viaje.origen_texto} destino={viaje.destino_texto} />
        <p className="text-sm text-texto-suave">Recorrido de unos {distanciaTexto(distanciaKm(origen, destino))} en línea recta.</p>
      </section>
      <Mapa etiqueta="Mapa de la solicitud" centro={origen} origen={origen} destino={destino} className="h-52" />
      <FormularioOferta viajeId={viaje.id} precioActual={miOferta?.precio} />
    </main>
  );
}
