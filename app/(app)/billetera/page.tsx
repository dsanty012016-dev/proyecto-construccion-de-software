import type { Metadata } from "next";
import Link from "next/link";
import { miBilletera, recargasEnProceso, type FilaMovimiento } from "@/app/lib/consultas-billetera";
import { cuposDeMovimientos } from "@/app/lib/consultas-comprobantes";
import { diaRelativo, horaCorta, pesos } from "@/app/lib/formato";
import { modoDeRecargaDisponible } from "@/app/lib/pasarela";
import { perfilActual } from "@/app/lib/sesion";
import { EstadoCuenta } from "@/app/ui/comun/estado-cuenta";
import { FormularioRecarga } from "@/app/ui/comun/formulario-recarga";
import { destinoDeRecarga, textoDeRetorno } from "@/app/lib/retorno-recarga";

export const metadata: Metadata = { title: "Billetera" };

// Billetera: el saldo grande sobre el fondo, la recarga con montos rápidos y
// los movimientos agrupados por día. El modo de recarga es explícito; una
// configuración incompleta no habilita saldo ficticio (docs/pagos.md).
export default async function PaginaBilletera({ searchParams }: { searchParams: Promise<{ volver?: string | string[] }> }) {
  const volverA = destinoDeRecarga((await searchParams).volver);
  const { usuario, perfil } = await perfilActual();
  const [{ saldo, movimientos, ahora }, enProceso, modo] = await Promise.all([
    miBilletera(usuario.id),
    recargasEnProceso(usuario.id),
    modoDeRecargaDisponible(),
  ]);
  const cupos = await cuposDeMovimientos(movimientos);
  const etiquetaModo = modo === "prueba" ? "Simulación interna" : modo === "wompi-pruebas" ? "Wompi Sandbox" : modo === "wompi" ? "Pagos con dinero real" : "Recargas no disponibles";

  // Vienen del más nuevo al más viejo; se agrupan seguidos por día.
  const dias: { dia: string; movimientos: FilaMovimiento[] }[] = [];
  for (const m of movimientos) {
    const dia = diaRelativo(m.creado_en, ahora);
    const ultimo = dias[dias.length - 1];
    if (ultimo && ultimo.dia === dia) ultimo.movimientos.push(m);
    else dias.push({ dia, movimientos: [m] });
  }

  return (
    <main className="space-y-6 px-5 pt-6">
      <header className="billetera-saldo space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-bold">Tu saldo</h1>
          <span className="producto-estado" data-estado={modo === "no-disponible" ? "atencion" : undefined}>{etiquetaModo}</span>
        </div>
        <p className="cifra">{pesos(saldo)}</p>
        {perfil?.rol === "conductor" && <p className="text-sm text-texto-suave">Tus ganancias incluyen el descuento del 10 % de UniGo.</p>}
      </header>

      <EstadoCuenta personaId={usuario.id} siempre />

      <div className="billetera-distribucion">
      <div className="min-w-0 space-y-5">
      <section aria-labelledby="titulo-recarga" className="producto-panel space-y-3 p-4">
        <h2 id="titulo-recarga" className="text-lg">
          Recargar
        </h2>
        {volverA && <div className="space-y-2 rounded-xl border border-texto-suave/30 p-3 text-sm">
          <p>Recargar no acepta ofertas ni paga puestos, y no amplía el plazo para pagar. Al volver se comprobarán el saldo, el estado y el plazo.</p>
          <Link href={volverA} className="inline-flex min-h-11 items-center font-semibold text-secundario">{textoDeRetorno(volverA)}</Link>
        </div>}
        <FormularioRecarga modo={modo} saldo={saldo} volverA={volverA} />
        <Link href="/billetera/recargas" className="inline-flex min-h-11 items-center font-semibold">Ver todas mis recargas</Link>
        {enProceso.length > 0 && (
          <ul aria-label="Recargas en proceso" className="border-t border-dashed border-texto-suave/40 pt-1">
            {enProceso.map((recarga) => (
              <li key={recarga.id}>
                <Link
                  href={`/billetera/recarga/${recarga.id}${volverA ? `?volver=${encodeURIComponent(volverA)}` : ""}`}
                  className="flex min-h-11 items-center justify-between gap-3 text-sm text-texto hover:text-secundario"
                >
                  <span>Recarga de {pesos(recarga.monto)} {recarga.requiere_revision ? "en revisión" : "en proceso"}</span>
                  <span className="font-semibold text-secundario">Ver</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {perfil?.rol === "conductor" && <section className="producto-panel space-y-2 p-4" aria-labelledby="titulo-retirar">
        <h2 id="titulo-retirar" className="text-base">Tus ganancias</h2>
        <p className="text-sm text-texto-suave">Solicita desde $20.000 a tu Nequi. El equipo revisa tus documentos y el plazo máximo es de siete días.</p>
        <Link href="/billetera/retiros" className="inline-flex min-h-12 items-center font-semibold">Retirar ganancias y ver solicitudes</Link>
      </section>}
      </div>

      <section aria-labelledby="titulo-movimientos" className="producto-panel p-4">
        <h2 id="titulo-movimientos" className="text-lg">
          Movimientos
        </h2>
        {movimientos.length === 0 ? (
          <p className="mt-2 text-sm text-texto-suave">Todavía no tienes movimientos. Aquí verás tus recargas, pagos y devoluciones.</p>
        ) : (
          dias.map(({ dia, movimientos: delDia }) => (
            <div key={dia} className="mt-3">
              <h3 className="font-texto text-xs font-bold text-texto-suave">{dia}</h3>
              <ul>
                {delDia.map((m) => {
                  const cupo = m.puesto_id ? cupos.get(m.puesto_id) : null;
                  const detalle = m.recarga_id ? `/billetera/recarga/${m.recarga_id}`
                    : m.viaje_id ? `/viajes/${m.viaje_id}` : cupo ? `/viajes/cupo/${cupo}` : null;
                  return (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-texto-suave/15 py-3 last:border-b-0">
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="text-sm font-semibold break-words">{m.descripcion}</p>
                      <p className="text-xs text-texto-suave">
                        {horaCorta(m.creado_en).hora} {horaCorta(m.creado_en).periodo}
                      </p>
                      {detalle && <Link href={m.recarga_id ? detalle : `${detalle}?volver=%2Fbilletera`} className="inline-flex min-h-11 items-center text-sm font-semibold text-secundario underline underline-offset-4">{m.recarga_id ? "Ver detalle de la recarga" : `Ver detalle del ${cupo ? "cupo" : "viaje"}`}</Link>}
                    </div>
                    <p className={`max-w-full break-all font-titulo font-bold tabular-nums ${m.monto > 0 ? "text-secundario" : "text-texto"}`}>
                      {m.monto > 0 ? "+" : "−"}
                      {pesos(Math.abs(m.monto))}
                    </p>
                  </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </section>
      </div>
    </main>
  );
}
