import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cupoActivoDelConductor } from "@/app/lib/consultas-cupo";
import { sedeDeUniversidad, vehiculoDe, viajeActivoDelConductor } from "@/app/lib/consultas-viaje";
import { puestosMaximos } from "@/app/lib/cupo";
import { exigirRol } from "@/app/lib/sesion";
import { Aviso } from "@/app/ui/auth/campos";
import { EncabezadoPantalla } from "@/app/ui/comun/encabezado-pantalla";
import { FormularioCupo } from "@/app/ui/conductor/formulario-cupo";

export const metadata: Metadata = { title: "Publicar cupo" };

export default async function PaginaNuevoCupo() {
  const { usuario, perfil } = await exigirRol("conductor");
  if (await cupoActivoDelConductor(usuario.id)) redirect("/conductor/cupo");
  if (await viajeActivoDelConductor(usuario.id)) redirect("/conductor/viaje");
  const [vehiculo, sede] = await Promise.all([vehiculoDe(usuario.id), sedeDeUniversidad(perfil.universidad_id)]);

  return (
    <main className="space-y-6 px-5 pt-6">
      <EncabezadoPantalla titulo="Publicar cupo" texto="Tu recorrido hacia la U, con hora de salida." volverA="/conductor" />
      {!vehiculo ? (
        <div className="space-y-3">
          <Aviso tipo="info">Para publicar un cupo primero registra tu vehículo.</Aviso>
          <Link
            href="/conductor/vehiculo"
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-primario font-titulo font-semibold text-texto hover:bg-primario/85"
          >
            Registrar mi vehículo
          </Link>
        </div>
      ) : !sede || sede.lat === null || sede.lng === null ? (
        <Aviso tipo="error">Tu universidad todavía no tiene la ubicación de la sede configurada. Avísale al equipo.</Aviso>
      ) : (
        <FormularioCupo sede={{ nombre: sede.nombre, lat: sede.lat, lng: sede.lng }} puestosMaximos={puestosMaximos(vehiculo.placa)} />
      )}
    </main>
  );
}
