import type { Metadata } from "next";
import { miBilletera } from "@/app/lib/consultas-billetera";
import { fechaCorta, pesos } from "@/app/lib/formato";
import { perfilActual } from "@/app/lib/sesion";
import { EstadoCuenta } from "@/app/ui/comun/estado-cuenta";
import { FormularioRecarga } from "@/app/ui/comun/formulario-recarga";

export const metadata: Metadata = { title: "Billetera" };

// Billetera simulada: saldo, recarga de prueba y movimientos (pagos, devoluciones y ganancias).
export default async function PaginaBilletera() {
  const { usuario, perfil } = await perfilActual();
  const { saldo, movimientos } = await miBilletera(usuario.id);

  return (
    <main className="space-y-6 px-5 pt-6">
      <header>
        <h1 className="text-3xl tracking-tight">Billetera</h1>
        <p className="text-sm text-texto-suave">Saldo de prueba para pagar y cobrar viajes en UniGo.</p>
      </header>

      <EstadoCuenta personaId={usuario.id} />

      <section aria-label="Saldo" className="rounded-2xl bg-primario p-5 text-texto">
        <p className="text-sm">Tu saldo</p>
        <p className="font-titulo text-4xl font-bold">{pesos(saldo)}</p>
        {perfil?.rol === "conductor" && <p className="mt-1 text-sm">Aquí llegan tus ganancias (ya sin el 10 % de UniGo).</p>}
      </section>

      <section aria-labelledby="titulo-recarga" className="space-y-3 rounded-2xl bg-superficie p-5">
        <h2 id="titulo-recarga" className="text-lg">
          Recargar
        </h2>
        <FormularioRecarga />
      </section>

      <section aria-labelledby="titulo-movimientos" className="space-y-3">
        <h2 id="titulo-movimientos" className="text-lg">
          Movimientos
        </h2>
        {movimientos.length === 0 ? (
          <p className="text-sm text-texto-suave">Todavía no tienes movimientos.</p>
        ) : (
          <ul className="divide-y divide-texto-suave/15 rounded-2xl bg-superficie">
            {movimientos.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{m.descripcion}</p>
                  <p className="text-xs text-texto-suave">{fechaCorta(m.creado_en)}</p>
                </div>
                <p className={`shrink-0 font-titulo font-bold ${m.monto > 0 ? "text-secundario" : "text-texto"}`}>
                  {m.monto > 0 ? "+" : "−"}
                  {pesos(Math.abs(m.monto))}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
