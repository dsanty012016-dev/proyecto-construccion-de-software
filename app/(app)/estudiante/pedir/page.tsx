import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sedeDeUniversidad, viajeActivoDelEstudiante } from "@/app/lib/consultas-viaje";
import { exigirRol } from "@/app/lib/sesion";
import { EncabezadoPantalla } from "@/app/ui/comun/encabezado-pantalla";
import { FormularioPedir } from "@/app/ui/estudiante/formulario-pedir";

export const metadata: Metadata = { title: "Pedir viaje" };

export default async function PaginaPedir() {
  const { usuario, perfil } = await exigirRol("estudiante");
  // Solo un viaje a la vez: si ya tiene uno, se va a verlo.
  if (await viajeActivoDelEstudiante(usuario.id)) redirect("/estudiante/viaje");
  const sede = await sedeDeUniversidad(perfil.universidad_id);

  return (
    <main className="space-y-6 px-5 pt-6">
      <EncabezadoPantalla titulo="Pedir viaje" volverA="/estudiante" />
      <FormularioPedir destino={sede?.nombre ?? "Tu universidad"} />
    </main>
  );
}
