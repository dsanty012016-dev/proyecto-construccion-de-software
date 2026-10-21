import { estadoDeCuenta } from "@/app/lib/consultas-billetera";
import { fechaCorta } from "@/app/lib/formato";
import { STRIKES_PARA_SUSPENDER } from "@/app/lib/pagos";

// Aviso de strikes y suspensión (012). No muestra nada si la cuenta está limpia.
export async function EstadoCuenta({ personaId, siempre }: { personaId: string; siempre?: boolean }) {
  const { strikes, suspendidoHasta } = await estadoDeCuenta(personaId);

  if (suspendidoHasta) {
    return (
      <div role="alert" className="rounded-2xl border border-error/40 bg-error/10 p-4 text-sm text-error">
        <p className="font-bold">Tu cuenta está suspendida hasta el {fechaCorta(suspendidoHasta)}.</p>
        <p>Juntaste {STRIKES_PARA_SUSPENDER} strikes por cancelaciones. Mientras tanto puedes ver la app, pero no pedir ni ofrecer viajes.</p>
      </div>
    );
  }
  if (strikes === 0 && !siempre) return null;
  return (
    <div role="status" className="rounded-2xl border border-texto-suave/25 p-4 text-sm text-texto-suave">
      {strikes === 0
        ? "No tienes strikes."
        : `Llevas ${strikes} de ${STRIKES_PARA_SUSPENDER} strikes. Con ${STRIKES_PARA_SUSPENDER}, tu cuenta se suspende unos días.`}
    </div>
  );
}
