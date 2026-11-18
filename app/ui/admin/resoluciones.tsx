import Link from "next/link";
import { historialAdminDeRetiros, incidenciasDePago } from "@/app/lib/consultas-retiros";
import { pesos } from "@/app/lib/formato";
import { FormularioIncidencia } from "./formulario-incidencia";

const fecha = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", dateStyle: "medium", timeStyle: "short" });
const enFecha = (iso: string) => fecha.format(new Date(iso));
const enlace = "inline-flex min-h-11 items-center font-semibold text-secundario underline underline-offset-4";

export function PaginasAdmin({ pagina, total, href }: { pagina: number; total: number; href: (n: number) => string }) {
  if (pagina === 1 && total <= 20) return null;
  return (
    <nav aria-label="Páginas de esta cola" className="flex flex-wrap items-center gap-x-4 text-sm">
      <span className="text-texto-suave">Página {pagina}</span>
      {pagina > 1 && <Link className={enlace} href={href(pagina - 1)}>Anterior</Link>}
      {pagina * 20 < total && <Link className={enlace} href={href(pagina + 1)}>Siguiente</Link>}
      {pagina > 1 && (pagina - 1) * 20 >= total && <Link className={enlace} href={href(1)}>Volver a la primera página</Link>}
    </nav>
  );
}

export async function RetirosResueltos({ pagina, referencia }: { pagina: number; referencia: string | null }) {
  const { retiros, nombres, total } = await historialAdminDeRetiros(pagina, referencia);
  const base = "/admin?cola=retiros&vista=resueltos";
  return (
    <section aria-labelledby="retiros-resueltos" className="space-y-4">
      <h2 id="retiros-resueltos" className="text-lg">Retiros resueltos</h2>
      <form action="/admin" className="space-y-2 text-sm">
        <input type="hidden" name="cola" value="retiros" />
        <input type="hidden" name="vista" value="resueltos" />
        <label htmlFor="referencia-pago" className="block font-semibold">Buscar por referencia de pago en Nequi</label>
        <input name="referencia" id="referencia-pago" defaultValue={referencia ?? ""} maxLength={100}
          className="min-h-11 w-full rounded-xl border border-texto-suave/60 bg-superficie px-3" />
        <div className="flex flex-wrap gap-x-4">
          <button className="min-h-11 rounded-xl border border-texto-suave/40 px-3 font-semibold" type="submit">Buscar</button>
          {referencia && <Link href={base} className={enlace}>Ver todos</Link>}
        </div>
      </form>
      {!retiros.length && <p role="status" className="text-sm text-texto-suave">
        {referencia ? "No encontramos retiros con esa referencia." : "No hay retiros resueltos en esta página."}
      </p>}
      <ul className="divide-y divide-texto-suave/20">
        {retiros.map((r) => (
          <li key={r.id} className="space-y-1 py-3 text-sm">
            <p className="flex flex-wrap justify-between gap-x-3 font-bold">
              <span className="min-w-0 break-words">{nombres.get(r.conductor_id) ?? "Conductor"}</span><span>{pesos(r.monto)}</span>
            </p>
            <p className="font-semibold">{r.estado === "pagado" ? "Pagado" : "Rechazado"} · {r.simulado ? "Prueba" : "Dinero real"}</p>
            <p className="text-texto-suave">Solicitado el {enFecha(r.solicitado_en)}</p>
            {r.resuelto_en && <p className="text-texto-suave">Resuelto el {enFecha(r.resuelto_en)}</p>}
            <p>Revisó {r.revisado_por ? nombres.get(r.revisado_por) ?? "Administrador" : "Sin responsable registrado"}</p>
            {r.referencia_pago && <p className="break-all">Referencia de pago: {r.referencia_pago}</p>}
            {r.motivo && <p className="break-words">Motivo: {r.motivo}</p>}
            <p className="break-all text-xs text-texto-suave">Solicitud {r.id}</p>
          </li>
        ))}
      </ul>
      <PaginasAdmin pagina={pagina} total={total} href={(n) =>
        `${base}&pagina=${n}${referencia ? `&referencia=${encodeURIComponent(referencia)}` : ""}`} />
    </section>
  );
}

const motivos: Record<string, string> = {
  referencia_desconocida: "Referencia no encontrada",
  monto_distinto: "El monto o la moneda no coincide",
  limite_saldo: "El pago excede el saldo permitido",
  anulacion: "Wompi anuló un pago acreditado",
  pago_adicional: "Hay un pago adicional para esta recarga",
  transaccion_reutilizada: "La transacción ya aparece en otra recarga",
  estado_inconsistente: "Cambió el estado de un pago acreditado",
};

export async function IncidenciasAdmin({ pagina, resueltas }: { pagina: number; resueltas: boolean }) {
  const incidencias = await incidenciasDePago(resueltas, pagina);
  return (
    <section aria-labelledby="titulo-incidencias" className="space-y-4">
      <h2 id="titulo-incidencias" className="text-lg">{resueltas ? "Revisiones cerradas" : "Pagos que necesitan revisión"}</h2>
      {!incidencias.length && <p role="status" className="text-sm text-texto-suave">No hay incidencias en esta página.</p>}
      <ul className="space-y-3">
        {incidencias.map((i) => (
          <li key={i.id} className="space-y-3 rounded-xl bg-superficie p-4 text-sm">
            <div className="space-y-1">
              <p className="font-semibold">{motivos[i.motivo] ?? "Revisión de pago"}</p>
              <p className="text-texto-suave">Detectada el {enFecha(i.detectado_en)}</p>
              <p className="break-all">Transacción del incidente: {i.transaccion}</p>
              {i.recarga_id ? (
                <>
                  <p className="break-all">Referencia UniGo: {i.recarga_id}</p>
                  {i.monto !== null && <p>Monto de la recarga: {pesos(i.monto)} · Estado en UniGo: {i.estado_recarga}</p>}
                  {i.transaccion_recarga && i.transaccion_recarga !== i.transaccion &&
                    <p className="break-all">Transacción asociada a la recarga: {i.transaccion_recarga}</p>}
                  {i.creditos_coincidentes !== null && (
                    <p className="text-texto-suave">Movimientos de recarga que coinciden en monto y hora: {i.creditos_coincidentes}.</p>
                  )}
                </>
              ) : <p className="text-texto-suave">UniGo no encontró una recarga vinculada.</p>}
            </div>
            {i.resuelta_en ? (
              <div className="space-y-1 border-t border-texto-suave/20 pt-2">
                <p className="font-semibold">Revisión cerrada el {enFecha(i.resuelta_en)}</p>
                <p>Revisó {i.responsable ?? "Administrador"}</p>
                <p className="whitespace-pre-wrap break-words">{i.nota_revision}</p>
              </div>
            ) : <FormularioIncidencia idIncidencia={i.id} />}
          </li>
        ))}
      </ul>
      <PaginasAdmin pagina={pagina} total={incidencias[0]?.total ?? 0} href={(n) =>
        `/admin?cola=incidencias${resueltas ? "&vista=resueltos" : ""}&pagina=${n}`} />
    </section>
  );
}
