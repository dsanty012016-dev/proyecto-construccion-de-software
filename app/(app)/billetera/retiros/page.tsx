import type { Metadata } from "next";
import Link from "next/link";
import { misRetiros, opcionesDeRetiro } from "@/app/lib/consultas-retiros";
import { fechaCorta, pesos } from "@/app/lib/formato";
import { paginaValida } from "@/app/lib/retiros";
import { exigirRol } from "@/app/lib/sesion";
import { EncabezadoPantalla } from "@/app/ui/comun/encabezado-pantalla";
import { FormularioRetiro } from "@/app/ui/comun/formulario-retiro";
import { Aviso } from "@/app/ui/auth/campos";

export const metadata: Metadata = { title: "Retirar ganancias" };
export default async function PaginaRetiros({ searchParams }: { searchParams: Promise<{ pagina?: string; solicitado?: string }> }) {
  const { usuario } = await exigirRol("conductor");
  const parametros = await searchParams;
  const pagina = paginaValida(parametros.pagina);
  const [opciones, historial] = await Promise.all([opcionesDeRetiro(), misRetiros(usuario.id, pagina)]);
  return <main className="space-y-6 px-5 pt-6">
    <EncabezadoPantalla titulo="Retirar ganancias" texto="A tu Nequi, con revisión del equipo." volverA="/billetera" />
    {parametros.solicitado === "1" && <Aviso tipo="listo">Solicitud recibida. El importe ya está apartado y puedes consultar aquí su estado.</Aviso>}
    <section className="space-y-3" aria-labelledby="disponible-retiro">
      <h2 id="disponible-retiro" className="text-base">Ganancias disponibles</h2>
      <p className="cifra text-4xl">{pesos(opciones.disponible)}</p>
      <p className="text-sm text-texto-suave">Las recargas para viajar no se cuentan como ganancias. Los retiros pendientes ya están descontados de esta cifra.</p>
      {opciones.documentacion_lista ? <FormularioRetiro disponible={opciones.disponible} simulado={opciones.simulado} /> : <p className="text-sm">Primero deben aprobar tus documentos. <Link href="/conductor/documentos">Revisar mi documentación</Link></p>}
    </section>
    <section aria-labelledby="historial-retiros" className="space-y-3">
      <h2 id="historial-retiros" className="text-lg">Mis retiros</h2>
      {!historial.retiros.length && <p className="text-sm text-texto-suave">Todavía no tienes retiros en esta página.</p>}
      <ul className="divide-y divide-texto-suave/20">{historial.retiros.map((retiro) => <li key={retiro.id} className="space-y-2 py-4">
        <p className="flex flex-wrap justify-between gap-2 font-semibold"><span>{pesos(retiro.monto)}</span><span>{retiro.estado === "solicitado" ? (retiro.asignado_en ? "En trámite" : "Por revisar") : retiro.estado === "pagado" ? "Pagado" : "No aprobado"}</span></p>
        <p className="text-sm text-texto-suave">{retiro.simulado && "Prueba · "}Nequi {retiro.nequi} · {fechaCorta(retiro.solicitado_en)}</p>
        {retiro.estado === "solicitado" && <p className="text-sm">Plazo máximo: {fechaCorta(retiro.plazo_hasta)}.</p>}
        {retiro.referencia_pago && <p className="text-sm break-all">Referencia del pago: {retiro.referencia_pago}</p>}
        {retiro.motivo && <p className="text-sm">{retiro.motivo}. El dinero regresó a tu billetera.</p>}
      </li>)}</ul>
      <nav aria-label="Páginas de retiros" className="flex flex-wrap justify-between gap-3">
        {pagina > 1 && <Link className="inline-flex min-h-11 items-center" href={`?pagina=${pagina - 1}`}>Anterior</Link>}
        {pagina * 20 < historial.total && <Link className="inline-flex min-h-11 items-center" href={`?pagina=${pagina + 1}`}>Siguiente</Link>}
      </nav>
    </section>
  </main>;
}
