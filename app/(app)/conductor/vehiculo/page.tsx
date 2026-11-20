import type { Metadata } from "next";
import Link from "next/link";
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
      <div className="producto-panel p-4"><FormularioVehiculo vehiculo={vehiculo} /></div>
      <Link
        href="/conductor/documentos"
        className="flex min-h-12 w-full items-center justify-center rounded-xl border border-linea px-3 py-2 text-center font-semibold text-texto hover:bg-superficie"
      >
        Mis documentos (cédula, licencia, tarjeta de propiedad)
      </Link>
      <p className="text-sm text-texto-suave">Si cambias la placa, la tarjeta de propiedad vuelve a revisión.</p>
    </main>
  );
}
