import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { viajeParaCalificar } from "@/app/lib/consultas-viaje";
import { nombreCorto, pesos } from "@/app/lib/formato";
import { perfilActual } from "@/app/lib/sesion";
import { Avatar } from "@/app/ui/comun/avatar";
import { FormularioCalificar } from "@/app/ui/comun/formulario-calificar";
import { IconoCheck } from "@/app/ui/comun/iconos-app";

export const metadata: Metadata = { title: "Calificar viaje" };

// Después de terminar el viaje, cada uno califica al otro (una sola vez).
export default async function PaginaCalificar({ params }: { params: Promise<{ id: string }> }) {
  const { usuario } = await perfilActual();
  const { id } = await params;
  const datos = await viajeParaCalificar(id, usuario.id);
  if (!datos || datos.yaCalifique) redirect("/viajes");
  const { viaje, otro } = datos;
  const nombre = otro ? nombreCorto(otro.nombre) : "la otra persona";

  return (
    <main className="flex flex-col items-center gap-6 px-5 pt-10">
      <span className="flex size-16 items-center justify-center rounded-full bg-superficie text-secundario">
        <IconoCheck className="size-8" />
      </span>
      <div className="space-y-1 text-center">
        <h1 className="text-2xl tracking-tight">¡Viaje terminado!</h1>
        {viaje.precio !== null && <p className="text-texto-suave">{pesos(viaje.precio)}</p>}
      </div>
      <div className="w-full space-y-5 rounded-2xl bg-superficie p-5">
        <div className="flex items-center gap-3">
          <Avatar nombre={otro?.nombre ?? "?"} />
          <p className="font-bold">{nombre}</p>
        </div>
        <FormularioCalificar viajeId={viaje.id} aQuien={nombre} />
      </div>
    </main>
  );
}
