import type { Metadata } from "next";
import { vehiculoDe } from "@/app/lib/consultas-viaje";
import { exigirRol } from "@/app/lib/sesion";
import { EncabezadoPantalla } from "@/app/ui/comun/encabezado-pantalla";
import { FormularioVehiculo } from "@/app/ui/conductor/formulario-vehiculo";

export const metadata: Metadata = { title: "Mi vehículo" };

export default async function PaginaVehiculo() {
  const { usuario } = await exigirRol("conductor");
  const vehiculo = await vehiculoDe(usuario.id);
  return (
    <main className="space-y-6 px-5 pt-6">
      <EncabezadoPantalla
        titulo="Mi vehículo"
        texto={vehiculo ? "Los estudiantes ven estos datos cuando ofertas." : "Lo necesitas para ponerte disponible y ofertar."}
      />
      <FormularioVehiculo vehiculo={vehiculo} />
    </main>
  );
}
