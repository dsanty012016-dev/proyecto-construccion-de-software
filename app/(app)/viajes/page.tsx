import type { Metadata } from "next";
import Link from "next/link";
import { historialDeViajes } from "@/app/lib/consultas-viaje";
import { etiquetaEstado, fechaCorta, nombreCorto, pesos } from "@/app/lib/formato";
import { perfilActual } from "@/app/lib/sesion";

export const metadata: Metadata = { title: "Mis viajes" };

// Historial de viajes terminados y cancelados, para estudiante y conductor.
export default async function PaginaViajes() {
  const { usuario, perfil } = await perfilActual();
  const historial = await historialDeViajes(usuario.id);
  const esConductor = perfil?.rol === "conductor";

  return (
    <main className="space-y-6 px-5 pt-6">
      <header>
        <h1 className="text-3xl tracking-tight">Mis viajes</h1>
        <p className="text-sm text-texto-suave">Historial de {esConductor ? "los viajes que hiciste" : "tus viajes"}.</p>
      </header>

      {historial.length === 0 ? (
        <p role="status" className="rounded-2xl border border-texto-suave/25 p-6 text-center text-texto-suave">
          Aún no tienes viajes terminados.
        </p>
      ) : (
        <ul className="space-y-3">
          {historial.map(({ viaje, otraPersona, calificado }) => (
            <li key={viaje.id} className="space-y-3 rounded-2xl bg-superficie p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm text-texto-suave">{fechaCorta(viaje.terminado_en ?? viaje.cancelado_en ?? viaje.creado_en)}</p>
                <p className={`text-sm font-semibold ${viaje.estado === "cancelado" ? "text-texto-suave" : "text-secundario"}`}>
                  {etiquetaEstado(viaje.estado)}
                </p>
              </div>
              <p className="font-semibold">
                {viaje.origen_texto} → {viaje.destino_texto}
              </p>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-texto-suave">{otraPersona ? nombreCorto(otraPersona) : "Sin conductor"}</p>
                {viaje.precio !== null && viaje.estado === "terminado" && <p className="font-titulo font-bold">{pesos(viaje.precio)}</p>}
              </div>
              {viaje.estado === "terminado" &&
                (calificado ? (
                  <p className="text-sm text-texto-suave">Ya calificaste este viaje.</p>
                ) : (
                  <Link
                    href={`/viajes/${viaje.id}/calificar`}
                    className="flex min-h-11 w-full items-center justify-center rounded-xl border border-texto-suave/30 text-sm font-semibold text-texto hover:bg-fondo"
                  >
                    Calificar
                  </Link>
                ))}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
