import type { Metadata } from "next";
import { reportesRecientes } from "@/app/lib/consultas-billetera";
import { conductoresPorRevisar } from "@/app/lib/consultas-verificacion";
import { nombreDocumento } from "@/app/lib/documentos";
import { fechaCorta, pesos } from "@/app/lib/formato";
import { cedulasParaRevisarRetiros, horaDeRevision, incidenciasDePago, retirosPorRevisar } from "@/app/lib/consultas-retiros";
import { exigirAdmin } from "@/app/lib/sesion";
import { FormularioRevisar } from "@/app/ui/admin/formulario-revisar";
import { Aviso } from "@/app/ui/auth/campos";
import { EncabezadoPantalla } from "@/app/ui/comun/encabezado-pantalla";
import { FormularioRevisarRetiro } from "@/app/ui/admin/formulario-retiro";

export const metadata: Metadata = { title: "Administración" };

// Panel de administración: documentos de conductores por revisar. Los archivos
// se abren con enlaces firmados que vencen en 5 minutos (recarga para otros).
export default async function PaginaAdmin() {
  const { usuario } = await exigirAdmin();
  const [conductores, reportes, retiros, incidencias] = await Promise.all([conductoresPorRevisar(), reportesRecientes(), retirosPorRevisar(), incidenciasDePago()]);
  const cedulas = await cedulasParaRevisarRetiros(retiros.filter((retiro) => retiro.conductor_id !== usuario.id).map((retiro) => retiro.conductor_id));
  const deOtros = conductores.filter((c) => c.conductorId !== usuario.id);
  const tengoPropios = deOtros.length !== conductores.length;
  const ahora = horaDeRevision();

  return (
    <main className="space-y-5 px-5 pt-6">
      <EncabezadoPantalla titulo="Administración" texto="Documentación, retiros y operaciones por revisar." volverA="/perfil" />
      <section aria-labelledby="titulo-retiros" className="space-y-4">
        <h2 id="titulo-retiros" className="text-lg">Retiros pendientes</h2>
        {!retiros.length && <p className="text-sm text-texto-suave">No hay retiros pendientes.</p>}
        {retiros.map((retiro) => <article key={retiro.id} className="space-y-3 border-b border-dashed border-texto-suave/40 pb-5">
          <h3 className="flex flex-wrap justify-between gap-2 font-bold"><span>{retiro.nombre}</span><span>{pesos(retiro.monto)}</span></h3>
          <p className="text-sm">Nequi {retiro.nequi} · {retiro.simulado ? "Solicitud de prueba" : "Dinero real"}</p>
          <p className="text-sm text-texto-suave">Solicitado: {fechaCorta(retiro.solicitado_en)}. Plazo máximo: {fechaCorta(retiro.plazo_hasta)}.</p>
          {Date.parse(retiro.plazo_hasta) < ahora && <p className="text-sm font-semibold text-error">El plazo de siete días ya se cumplió. Revisa esta solicitud con prioridad.</p>}
          {retiro.conductor_id === usuario.id ? <p className="text-sm">Otro administrador debe revisar tu solicitud.</p> : <>
            {cedulas.get(retiro.conductor_id) ? <a href={cedulas.get(retiro.conductor_id)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold">Abrir cédula del conductor (enlace de cinco minutos)</a> : <p className="text-sm text-error">La cédula no está disponible. Vuelve a cargar antes de registrar un pago.</p>}
            <FormularioRevisarRetiro retiroId={retiro.id} simulado={retiro.simulado} documentoDisponible={cedulas.has(retiro.conductor_id)} />
          </>}
        </article>)}
      </section>
      <section aria-labelledby="titulo-incidencias" className="space-y-3">
        <h2 id="titulo-incidencias" className="text-lg">Pagos que necesitan revisión</h2>
        {!incidencias.length && <p className="text-sm text-texto-suave">No hay incidencias registradas.</p>}
        <ul className="space-y-3">{incidencias.map((incidencia) => <li key={incidencia.id} className="space-y-1 rounded-xl bg-superficie p-4 text-sm">
          <p className="font-semibold">{{ referencia_desconocida: "Referencia no encontrada", monto_distinto: "El monto o la moneda no coincide", limite_saldo: "El pago excede el saldo permitido", anulacion: "Wompi anuló un pago acreditado", pago_adicional: "Hay un pago adicional para esta recarga", transaccion_reutilizada: "La transacción ya aparece en otra recarga", estado_inconsistente: "Cambió el estado de un pago acreditado" }[incidencia.motivo] ?? "Revisión de pago"}</p>
          <p className="break-all">Transacción: {incidencia.transaccion}</p>
          <p className="text-texto-suave">{fechaCorta(incidencia.detectado_en)}</p>
          {incidencia.recarga_id && <p className="break-all">Referencia de recarga: {incidencia.recarga_id}</p>}
        </li>)}</ul>
        <p className="text-sm text-texto-suave">No modifiques el saldo sin conciliar la operación con Wompi. La incidencia conserva lo ocurrido para revisarlo con el equipo.</p>
      </section>
      <h2 className="text-lg">Documentos de conductores</h2>
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
