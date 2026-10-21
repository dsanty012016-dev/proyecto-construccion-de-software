import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { solicitudParaOfertar, viajeActivoDelConductor } from "@/app/lib/consultas-viaje";
import { nombreCorto } from "@/app/lib/formato";
import { exigirRol } from "@/app/lib/sesion";
import { Avatar } from "@/app/ui/comun/avatar";
import { EncabezadoPantalla } from "@/app/ui/comun/encabezado-pantalla";
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

  return (
    <main className="space-y-6 px-5 pt-6">
      <EncabezadoPantalla titulo={miOferta ? "Cambiar tu oferta" : "Nueva solicitud"} volverA="/conductor" />
      <section aria-label="Solicitud" className="space-y-4 rounded-2xl bg-superficie p-4">
        <div className="flex items-center gap-3">
          <Avatar nombre={estudiante?.nombre ?? "Estudiante"} />
          <p className="font-bold">{estudiante ? nombreCorto(estudiante.nombre) : "Estudiante"}</p>
        </div>
        <RutaViaje origen={viaje.origen_texto} destino={viaje.destino_texto} />
      </section>
      <FormularioOferta viajeId={viaje.id} precioActual={miOferta?.precio} />
    </main>
  );
}
