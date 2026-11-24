import type { Metadata } from "next";
import Link from "next/link";
import { contadoresAdmin } from "@/app/lib/consultas-admin";
import { paginaValida } from "@/app/lib/retiros";
import { exigirAdmin } from "@/app/lib/sesion";
import type { ParametrosUrl } from "@/app/lib/validaciones-historial";
import { DocumentosPendientes, EmergenciasPendientes, ReportesRecibidos, RetirosPendientes } from "@/app/ui/admin/colas";
import { IncidenciasAdmin, PaginasAdmin, RetirosResueltos } from "@/app/ui/admin/resoluciones";
import { ResumenOperativo } from "@/app/ui/admin/resumen-operativo";
import { EncabezadoPantalla } from "@/app/ui/comun/encabezado-pantalla";

export const metadata: Metadata = { title: "Administración" };

const COLAS = [
  { clave: "emergencias", nombre: "Emergencias", unidad: "pendiente" },
  { clave: "retiros", nombre: "Retiros", unidad: "pendiente" },
  { clave: "incidencias", nombre: "Incidencias Wompi", unidad: "pendiente" },
  { clave: "documentos", nombre: "Documentos", unidad: "pendiente" },
  { clave: "reportes", nombre: "Reportes", unidad: "recibido" },
] as const;

export default async function PaginaAdmin({ searchParams }: { searchParams: Promise<ParametrosUrl> }) {
  const [{ usuario }, params] = await Promise.all([exigirAdmin(), searchParams]);
  const contadores = await contadoresAdmin();
  const cola = COLAS.find((c) => c.clave === params.cola)?.clave;
  const pagina = paginaValida(typeof params.pagina === "string" ? params.pagina : undefined);
  const resueltos = params.vista === "resueltos";
  const referencia = typeof params.referencia === "string" ? params.referencia.trim().slice(0, 100) || null : null;
  const verHistorial = cola === "retiros" || cola === "incidencias";
  const claseVista = "inline-flex min-h-11 flex-1 items-center justify-center rounded-xl px-2 text-center font-semibold";

  return (
    <main className="space-y-5 px-5 pt-6 pb-5">
      <EncabezadoPantalla titulo="Administración" volverA={cola ? "/admin" : "/perfil"} />
      <div className="admin-distribucion">
      <nav aria-label="Colas de administración">
        <ul className="producto-panel space-y-1 p-2">
          {COLAS.map(({ clave, nombre, unidad }) => (
            <li key={clave}>
              <Link href={`/admin?cola=${clave}`} aria-current={cola === clave ? "page" : undefined}
                className="admin-cola">
                <span className="font-semibold text-secundario">{nombre}</span>
                <span className="text-sm tabular-nums text-texto-suave">
                  {contadores[clave]} {unidad}{contadores[clave] === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0 space-y-4">
      {!cola && <ResumenOperativo />}
      {verHistorial && (
        <nav aria-label="Estado de los casos" className="producto-selector flex flex-wrap items-stretch gap-2 p-1 text-sm">
          <Link href={`/admin?cola=${cola}`} aria-current={!resueltos ? "page" : undefined}
            className={claseVista}>Pendientes</Link>
          <Link href={`/admin?cola=${cola}&vista=resueltos`} aria-current={resueltos ? "page" : undefined}
            className={claseVista}>Historial</Link>
        </nav>
      )}
      {cola === "retiros" && (resueltos
        ? <RetirosResueltos pagina={pagina} referencia={referencia} />
        : <RetirosPendientes persona={usuario.id} pagina={pagina} />)}
      {cola === "incidencias" && <IncidenciasAdmin pagina={pagina} resueltas={resueltos} />}
      {cola === "documentos" && <DocumentosPendientes persona={usuario.id} pagina={pagina} />}
      {cola === "emergencias" && <EmergenciasPendientes pagina={pagina} />}
      {cola === "reportes" && <ReportesRecibidos pagina={pagina} />}
      {cola && cola !== "incidencias" && !(cola === "retiros" && resueltos) && (
        <PaginasAdmin pagina={pagina} total={contadores[cola]} href={(n) => `/admin?cola=${cola}&pagina=${n}`} />
      )}
      </div>
      </div>
    </main>
  );
}
