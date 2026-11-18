import type { Metadata } from "next";
import Link from "next/link";
import { estadoDeCuenta, miBilletera, recargasEnProceso, type FilaMovimiento } from "@/app/lib/consultas-billetera";
import { diaRelativo, horaCorta, pesos } from "@/app/lib/formato";
import { STRIKES_PARA_SUSPENDER } from "@/app/lib/pagos";
import { modoDeRecarga } from "@/app/lib/pasarela";
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
  const modo = modoDeRecarga();
  const [{ saldo, movimientos, ahora }, cuenta, enProceso] = await Promise.all([
    miBilletera(usuario.id),
    estadoDeCuenta(usuario.id),
    recargasEnProceso(usuario.id),
  ]);

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
      <header>
        <h1 className="font-texto text-sm font-semibold text-texto-suave">Tu saldo</h1>
        <p className="mt-1 cifra whitespace-nowrap" style={{ fontSize: `clamp(1.5rem,${Math.min(16, 90 / pesos(saldo).length)}vw,4rem)` }}>{pesos(saldo)}</p>
        <p className="mt-2 text-[13px] text-texto-suave">
          {modo === "prueba" ? "Simulación interna · " : modo === "wompi-pruebas" ? "Wompi Sandbox · " : modo === "wompi" ? "Pagos con dinero real · " : "Recargas no disponibles · "}
          {cuenta.strikes} de {STRIKES_PARA_SUSPENDER} strikes
          {perfil?.rol === "conductor" && " · tus ganancias llegan ya sin el 10 % de UniGo"}
        </p>
      </header>

      {/* Los strikes ya se ven arriba; aquí solo el aviso de suspensión. */}
      {cuenta.suspendidoHasta && <EstadoCuenta personaId={usuario.id} />}

      <section aria-labelledby="titulo-recarga" className="space-y-3">
        <h2 id="titulo-recarga" className="text-base">
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

      {perfil?.rol === "conductor" && <section className="space-y-2 border-t border-dashed border-texto-suave/40 pt-4" aria-labelledby="titulo-retirar">
        <h2 id="titulo-retirar" className="text-base">Tus ganancias</h2>
        <p className="text-sm text-texto-suave">Solicita desde $20.000 a tu Nequi. El equipo revisa tus documentos y el plazo máximo es de siete días.</p>
        <Link href="/billetera/retiros" className="inline-flex min-h-12 items-center font-semibold">Retirar ganancias y ver solicitudes</Link>
      </section>}

      <section aria-labelledby="titulo-movimientos">
        <h2 id="titulo-movimientos" className="text-base">
          Movimientos
        </h2>
        {movimientos.length === 0 ? (
          <p className="mt-2 text-sm text-texto-suave">Todavía no tienes movimientos. Aquí verás tus recargas, pagos y devoluciones.</p>
        ) : (
          dias.map(({ dia, movimientos: delDia }) => (
            <div key={dia} className="mt-3">
              <h3 className="font-texto text-xs font-bold text-texto-suave">{dia}</h3>
              <ul>
                {delDia.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-texto-suave/15 py-3 last:border-b-0">
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="text-sm font-semibold break-words">{m.descripcion}</p>
                      <p className="text-xs text-texto-suave">
                        {horaCorta(m.creado_en).hora} {horaCorta(m.creado_en).periodo}
                      </p>
                    </div>
                    <p className={`max-w-full break-all font-titulo font-bold tabular-nums ${m.monto > 0 ? "text-secundario" : "text-texto"}`}>
                      {m.monto > 0 ? "+" : "−"}
                      {pesos(Math.abs(m.monto))}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
