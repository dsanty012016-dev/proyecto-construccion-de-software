import Link from "next/link";
import { aceptarOferta } from "@/app/lib/acciones-viaje";
import type { ConductorConOferta } from "@/app/lib/consultas-viaje";
import { nombreCorto, pesos } from "@/app/lib/formato";
import { Avatar } from "@/app/ui/comun/avatar";
import { BotonAccion } from "@/app/ui/comun/boton-accion";
import { Nota } from "@/app/ui/comun/nota";

// Una oferta de un conductor, como fila de la lista: quién es, su vehículo y
// su precio. Aceptarla paga en ese momento y cierra la búsqueda (la regla la
// hace cumplir aceptar_oferta en la base). La más barata va resaltada.
export function TarjetaOferta({ oferta, saldo, destacada }: { oferta: ConductorConOferta; saldo: number; destacada?: boolean }) {
  const { conductor, vehiculo } = oferta;
  const nombre = nombreCorto(conductor.nombre);
  const alcanza = saldo >= oferta.precio;
  return (
    <li className="space-y-3 border-b border-texto-suave/15 py-4 last:border-b-0">
      <div className="flex items-center gap-3">
        <Avatar nombre={conductor.nombre} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{nombre}</p>
          <p className="text-[13px] text-texto-suave">
            <Nota promedio={conductor.calificacion} total={conductor.total_calificaciones} /> · {conductor.viajes_terminados}{" "}
            {conductor.viajes_terminados === 1 ? "viaje" : "viajes"}
          </p>
        </div>
        <p className="font-titulo text-[22px] font-bold tabular-nums">{pesos(oferta.precio)}</p>
      </div>
      <p className="text-[13px] text-texto-suave">
        {vehiculo ? (
          <>
            {vehiculo.marca} {vehiculo.modelo} · {vehiculo.color} ·{" "}
            <span className="font-semibold tracking-wider text-texto">{vehiculo.placa}</span>
          </>
        ) : (
          "Vehículo sin registrar"
        )}
      </p>
      {alcanza ? (
        <BotonAccion
          accion={aceptarOferta}
          campos={{ oferta: oferta.ofertaId }}
          estilo={destacada ? "primario" : "borde"}
          enviando="Aceptando…"
          etiqueta={`Aceptar la oferta de ${nombre} y pagar ${pesos(oferta.precio)}`}
        >
          Aceptar y pagar {pesos(oferta.precio)}
        </BotonAccion>
      ) : (
        <p className="text-sm">
          Te faltan <strong className="tabular-nums">{pesos(oferta.precio - saldo)}</strong> de saldo.{" "}
          <Link href="/billetera" className="font-bold">
            Recargar
          </Link>
        </p>
      )}
    </li>
  );
}
