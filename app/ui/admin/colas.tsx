import { reportesRecientes } from "@/app/lib/consultas-billetera";
import { conductoresPorRevisar } from "@/app/lib/consultas-verificacion";
import { nombreDocumento } from "@/app/lib/documentos";
import { fechaCorta, pesos } from "@/app/lib/formato";
import { revisionDocumento } from "@/app/lib/preparacion-conductor";
import { cedulasParaRevisarRetiros, horaDeRevision, retirosPorRevisar } from "@/app/lib/consultas-retiros";
import { FormularioRevisar } from "@/app/ui/admin/formulario-revisar";
import { Aviso } from "@/app/ui/auth/campos";
import { FormularioRevisarRetiro } from "@/app/ui/admin/formulario-retiro";

export async function RetirosPendientes({ persona, pagina }: { persona: string; pagina: number }) {
  const retiros = await retirosPorRevisar(pagina);
  const cedulas = await cedulasParaRevisarRetiros(retiros.filter((r) => r.conductor_id !== persona).map((r) => r.conductor_id));
  const ahora = horaDeRevision();
  return (
      <section aria-labelledby="titulo-retiros" className="space-y-4">
        <h2 id="titulo-retiros" className="text-lg">Retiros pendientes</h2>
        {!retiros.length && <p className="text-sm text-texto-suave">No hay retiros pendientes.</p>}
        {retiros.map((retiro) => <article key={retiro.id} className="space-y-3 border-b border-dashed border-texto-suave/40 pb-5">
          <h3 className="flex flex-wrap justify-between gap-2 font-bold"><span>{retiro.nombre}</span><span>{pesos(retiro.monto)}</span></h3>
          <p className="text-sm">Nequi {retiro.nequi} · {retiro.simulado ? "Solicitud de prueba" : "Dinero real"}</p>
          <p className="text-sm text-texto-suave">Solicitado: {fechaCorta(retiro.solicitado_en)}. Plazo máximo: {fechaCorta(retiro.plazo_hasta)}.</p>
          {Date.parse(retiro.plazo_hasta) < ahora && <p className="text-sm font-semibold text-error">El plazo de siete días ya se cumplió. Revisa esta solicitud con prioridad.</p>}
          {retiro.conductor_id === persona ? <p className="text-sm">Otro administrador debe revisar tu solicitud.</p> : <>
            {cedulas.get(retiro.conductor_id) ? <a href={cedulas.get(retiro.conductor_id)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold">Abrir cédula del conductor (enlace de cinco minutos)</a> : <p className="text-sm text-error">La cédula no está disponible. Vuelve a cargar antes de registrar un pago.</p>}
            <FormularioRevisarRetiro retiroId={retiro.id} simulado={retiro.simulado} documentoDisponible={cedulas.has(retiro.conductor_id)} />
          </>}
        </article>)}
      </section>

  );
}

export async function DocumentosPendientes({ persona, pagina }: { persona: string; pagina: number }) {
  const conductores = await conductoresPorRevisar(pagina);
  const deOtros = conductores.filter((c) => c.conductorId !== persona);
  const tengoPropios = deOtros.length !== conductores.length;
  const ahora = horaDeRevision();
  return (
    <section className="space-y-4" aria-labelledby="titulo-documentos">
      <h2 id="titulo-documentos" className="text-lg">Documentos de conductores</h2>
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
              {conductor.documentos.map((doc) => {
                const { limite, vencido } = revisionDocumento(doc, ahora);
                return (
                <div key={doc.id} className="space-y-3 border-t border-texto-suave/20 pt-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="font-semibold">{nombreDocumento(doc.tipo)}</p>
                    <p className="text-xs text-texto-suave">{fechaCorta(doc.enviado_en)}</p>
                  </div>
                  {limite !== null && <p className={`text-sm ${vencido ? "font-semibold text-error" : "text-texto-suave"}`}>
                    {vencido ? "Plazo vencido el " : "Revisar antes del "}{fechaCorta(new Date(limite).toISOString())}
                  </p>}
                  {doc.enlace ? (
                    <a href={doc.enlace} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold">
                      Abrir documento (enlace de 5 minutos)
                    </a>
                  ) : (
                    <p className="text-sm text-error">No se encontró el archivo.</p>
                  )}
                  <FormularioRevisar documentoId={doc.id} />
                </div>
                );
              })}
            </li>
          ))}
        </ul>
      )}


    </section>
  );
}

export async function ReportesRecibidos({ pagina }: { pagina: number }) {
  const reportes = await reportesRecientes(pagina);
  return (
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

  );
}
