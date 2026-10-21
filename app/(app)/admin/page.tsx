import type { Metadata } from "next";
import { reportesRecientes } from "@/app/lib/consultas-billetera";
import { conductoresPorRevisar } from "@/app/lib/consultas-verificacion";
import { nombreDocumento } from "@/app/lib/documentos";
import { fechaCorta } from "@/app/lib/formato";
import { exigirAdmin } from "@/app/lib/sesion";
import { FormularioRevisar } from "@/app/ui/admin/formulario-revisar";
import { Aviso } from "@/app/ui/auth/campos";
import { EncabezadoPantalla } from "@/app/ui/comun/encabezado-pantalla";

export const metadata: Metadata = { title: "Administración" };

// Panel de administración: documentos de conductores por revisar. Los archivos
// se abren con enlaces firmados que vencen en 5 minutos (recarga para otros).
export default async function PaginaAdmin() {
  const { usuario } = await exigirAdmin();
  const [conductores, reportes] = await Promise.all([conductoresPorRevisar(), reportesRecientes()]);
  const deOtros = conductores.filter((c) => c.conductorId !== usuario.id);
  const tengoPropios = deOtros.length !== conductores.length;

  return (
    <main className="space-y-5 px-5 pt-6">
      <EncabezadoPantalla titulo="Revisar conductores" texto="Documentos pendientes y reportes." volverA="/perfil" />
      {tengoPropios && <Aviso tipo="info">Tus propios documentos los revisa otro administrador.</Aviso>}

      {deOtros.length === 0 ? (
        <p role="status" className="rounded-2xl border border-texto-suave/25 p-6 text-center text-texto-suave">
          No hay documentos por revisar.
        </p>
      ) : (
        <ul className="space-y-4">
          {deOtros.map((conductor) => (
            <li key={conductor.conductorId} className="space-y-4 rounded-2xl bg-superficie p-4">
              <div>
                <p className="text-lg font-bold">{conductor.nombre}</p>
                <p className="text-sm text-texto-suave">
                  {conductor.telefono ?? "Sin celular"} ·{" "}
                  {conductor.vehiculo
                    ? `${conductor.vehiculo.marca} ${conductor.vehiculo.modelo} · placa ${conductor.vehiculo.placa}`
                    : "Sin vehículo registrado"}
                </p>
              </div>
              {conductor.documentos.map((doc) => (
                <div key={doc.id} className="space-y-3 border-t border-texto-suave/20 pt-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-semibold">{nombreDocumento(doc.tipo)}</p>
                    <p className="text-xs text-texto-suave">{fechaCorta(doc.enviado_en)}</p>
                  </div>
                  {doc.enlace ? (
                    <a href={doc.enlace} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold">
                      Abrir documento (enlace de 5 minutos)
                    </a>
                  ) : (
                    <p className="text-sm text-error">No se encontró el archivo.</p>
                  )}
                  <FormularioRevisar documentoId={doc.id} />
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="titulo-reportes" className="space-y-3">
        <h2 id="titulo-reportes" className="text-lg">
          Reportes de mal comportamiento
        </h2>
        {reportes.length === 0 ? (
          <p className="text-sm text-texto-suave">No hay reportes.</p>
        ) : (
          <ul className="space-y-3">
            {reportes.map((r) => (
              <li key={r.id} className="space-y-1 rounded-2xl bg-superficie p-4">
                <p className="text-sm">
                  <span className="font-semibold">{r.autor}</span> reportó a <span className="font-semibold">{r.sobre}</span>
                </p>
                <p className="text-sm break-words">“{r.motivo}”</p>
                <p className="text-xs text-texto-suave">{fechaCorta(r.creadoEn)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
