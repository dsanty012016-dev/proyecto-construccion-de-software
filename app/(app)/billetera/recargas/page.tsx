import type { Metadata } from "next";
import Link from "next/link";
import { historialDeRecargas } from "@/app/lib/consultas-billetera";
import { fechaCorta, pesos } from "@/app/lib/formato";
import { paginaValida } from "@/app/lib/retiros";
import { perfilActual } from "@/app/lib/sesion";
import { EncabezadoPantalla } from "@/app/ui/comun/encabezado-pantalla";

export const metadata: Metadata = { title: "Mis recargas" };
export default async function PaginaRecargas({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const { usuario } = await perfilActual();
  const pagina = paginaValida((await searchParams).pagina);
  const { recargas, total } = await historialDeRecargas(usuario.id, pagina);
  return <main className="space-y-5 px-5 pt-6">
    <EncabezadoPantalla titulo="Mis recargas" texto="Consulta cada operación aunque haya tardado en confirmarse." volverA="/billetera" />
    {!recargas.length && <p className="text-texto-suave">No tienes recargas en esta página.</p>}
    <ul className="divide-y divide-texto-suave/20">{recargas.map((recarga) => <li key={recarga.id}>
      <Link href={`/billetera/recarga/${recarga.id}`} className="flex min-h-14 flex-wrap justify-between gap-2 py-4">
        <span className="font-semibold">{pesos(recarga.monto)}<span className="mt-1 block text-sm font-normal text-texto-suave">{fechaCorta(recarga.creada_en)}</span></span>
        <span>{recarga.revision_resuelta_en ? "Revisión completada" : recarga.requiere_revision ? "En revisión" : recarga.estado === "pendiente" ? "Pendiente" : recarga.estado === "aprobada" ? "Aprobada" : "No aprobada"}</span>
      </Link>
    </li>)}</ul>
    <nav aria-label="Páginas de recargas" className="flex flex-wrap justify-between gap-3">
      {pagina > 1 && <Link className="inline-flex min-h-11 items-center" href={`?pagina=${pagina - 1}`}>Anterior</Link>}
      {pagina * 20 < total && <Link className="inline-flex min-h-11 items-center" href={`?pagina=${pagina + 1}`}>Siguiente</Link>}
    </nav>
  </main>;
}
