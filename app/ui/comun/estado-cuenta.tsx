import Link from "next/link";
import { estadoDeCuenta } from "@/app/lib/consultas-billetera";
import { fechaCorta } from "@/app/lib/formato";
import { STRIKES_PARA_SUSPENDER } from "@/app/lib/pagos";

// Resumen de faltas y suspensión. En Perfil y Billetera el historial siempre está disponible.
export async function EstadoCuenta({ personaId, siempre, enHistorial }: { personaId: string; siempre?: boolean; enHistorial?: boolean }) {
  const { strikes, suspendidoHasta } = await estadoDeCuenta(personaId);
  if (strikes === 0 && !suspendidoHasta && !siempre) return null;
  return (
    <div className={suspendidoHasta ? "rounded-2xl border border-error/40 p-4 text-sm" : "text-sm"}>
      {suspendidoHasta ? (
        <div role="alert" className="space-y-1">
          <p className="font-bold text-error">Cuenta suspendida hasta el {fechaCorta(suspendidoHasta)}.</p>
          <p>Durante la suspensión se bloquea pedir viajes, hacer ofertas, publicar cupos y pedir puestos.</p>
        </div>
      ) : strikes > 0 && (
        <p className="font-semibold">
          {strikes} de {STRIKES_PARA_SUSPENDER} faltas (strikes). Al llegar a {STRIKES_PARA_SUSPENDER}, se suspende la cuenta.
        </p>
      )}
      {!enHistorial && <Link href="/perfil/faltas" className="inline-flex min-h-11 items-center font-semibold text-secundario underline underline-offset-4">
        Ver faltas y reglas de la cuenta
      </Link>}
    </div>
  );
}
