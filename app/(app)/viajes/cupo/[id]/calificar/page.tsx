import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { calificarPuesto } from "@/app/lib/acciones-cupo";
import { cupoParaCalificar } from "@/app/lib/consultas-cupo";
import { fechaCorta, nombreCorto } from "@/app/lib/formato";
import { perfilActual } from "@/app/lib/sesion";
import { Avatar } from "@/app/ui/comun/avatar";
import { FormularioCalificar } from "@/app/ui/comun/formulario-calificar";
import { IconoCheck } from "@/app/ui/comun/iconos-app";

export const metadata: Metadata = { title: "Calificar cupo" };

// Al llegar un cupo, el estudiante califica al conductor y el conductor a
// cada estudiante que llevó (014). Muestra solo a quienes faltan; cuando no
// queda nadie, vuelve al historial.
export default async function PaginaCalificarCupo({ params }: { params: Promise<{ id: string }> }) {
  const { usuario } = await perfilActual();
  const { id } = await params;
  const datos = await cupoParaCalificar(id, usuario.id);
  if (!datos || datos.pendientes.length === 0) redirect("/viajes");
  const { cupo, soyConductor, pendientes } = datos;

  return (
    <main className="flex flex-col items-center gap-6 px-5 pt-10 pb-6">
      <span className="flex size-16 items-center justify-center rounded-full bg-superficie text-secundario">
        <IconoCheck className="size-8" />
      </span>
      <div className="space-y-1 text-center">
        <h1 className="text-2xl tracking-tight">{cupo.sentido === "regreso" ? "¡Llegaron!" : "¡Llegaron a la U!"}</h1>
        <p className="text-texto-suave">Cupo del {fechaCorta(cupo.sale_en)}</p>
      </div>
      {soyConductor && pendientes.length > 1 && (
        <p className="text-center text-sm text-texto-suave">Califica a cada estudiante que llevaste. Faltan {pendientes.length}.</p>
      )}
      <ul className="w-full space-y-4">
        {pendientes.map((p) => {
          const nombre = nombreCorto(p.nombre) || (soyConductor ? "el estudiante" : "el conductor");
          return (
            <li key={p.puestoId} className="space-y-5 rounded-2xl bg-superficie p-5">
              <div className="flex items-center gap-3">
                <Avatar nombre={p.nombre} sobreTarjeta />
                <p className="font-bold">{nombre}</p>
              </div>
              <FormularioCalificar campos={{ puesto: p.puestoId, cupo: cupo.id }} aQuien={nombre} accion={calificarPuesto} />
            </li>
          );
        })}
      </ul>
      <Link href="/viajes" className="inline-flex min-h-11 items-center text-sm font-semibold text-texto-suave hover:text-texto">
        Calificar después
      </Link>
    </main>
  );
}
