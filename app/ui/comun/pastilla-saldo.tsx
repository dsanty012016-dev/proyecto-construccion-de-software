import Link from "next/link";
import { miSaldo } from "@/app/lib/consultas-billetera";
import { pesos } from "@/app/lib/formato";
import { IconoBilletera } from "./iconos-app";

// Saldo siempre a la vista en la cabecera del inicio; lleva a la billetera.
export async function PastillaSaldo({ personaId }: { personaId: string }) {
  const saldo = await miSaldo(personaId);
  return (
    <Link
      href="/billetera"
      aria-label={`Tu saldo: ${pesos(saldo)}. Ir a la billetera`}
      className="flex min-h-11 max-w-full min-w-0 items-center gap-2 rounded-full border border-texto-suave/25 bg-fondo px-3.5 py-2 font-titulo text-[15px] font-semibold text-texto tabular-nums hover:bg-superficie"
    >
      <IconoBilletera className="size-[18px] shrink-0 text-secundario" />
      {pesos(saldo)}
    </Link>
  );
}
