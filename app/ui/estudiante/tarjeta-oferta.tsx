import Link from "next/link";
import { aceptarOferta } from "@/app/lib/acciones-viaje";
import type { ConductorConOferta } from "@/app/lib/consultas-viaje";
import { nombreCorto, pesos } from "@/app/lib/formato";
import { Avatar } from "@/app/ui/comun/avatar";
import { BotonAccion } from "@/app/ui/comun/boton-accion";
import { Nota } from "@/app/ui/comun/nota";
import { Placa } from "@/app/ui/comun/placa";
import { enlaceParaRecargar } from "@/app/lib/retorno-recarga";

// Una oferta de un conductor, como renglón del tiquete de ofertas: quién es,
// su vehículo con la placa y su precio. Aceptarla paga en ese momento y cierra
// la búsqueda (la regla la hace cumplir aceptar_oferta en la base). La más
// barata va con el botón azul.
export function TarjetaOferta({ oferta, saldo, destacada, viajeId }: { oferta: ConductorConOferta; saldo: number; destacada?: boolean; viajeId?: string }) {
  const { conductor, vehiculo } = oferta;
  const nombre = nombreCorto(conductor.nombre);
  const alcanza = saldo >= oferta.precio;
  return (
    <li className="oferta-fila">
      <div className="oferta-datos">
        <Avatar nombre={conductor.nombre} sobreTarjeta />
        <div className="min-w-0 flex-1 basis-24">
          <p className="font-bold [overflow-wrap:anywhere]">{nombre}</p>
          <p className="text-[13px] text-texto-suave">
            <Nota promedio={conductor.calificacion} total={conductor.total_calificaciones} /> · {conductor.viajes_terminados}{" "}
            {conductor.viajes_terminados === 1 ? "viaje" : "viajes"}
          </p>
        </div>
        <p className="cifra max-w-full [overflow-wrap:anywhere]">{pesos(oferta.precio)}</p>
      </div>
      {vehiculo ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-texto-suave">
          <span className="min-w-0 [overflow-wrap:anywhere]">
            {vehiculo.marca} {vehiculo.modelo}, {vehiculo.color}
          </span>
          <Placa placa={vehiculo.placa} />
        </p>
      ) : (
        <p className="text-[13px] text-texto-suave">Vehículo sin registrar</p>
      )}
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
          <Link href={enlaceParaRecargar(viajeId ? `/estudiante/viaje?viaje=${viajeId}` : null)} className="inline-flex min-h-11 items-center font-bold text-secundario">
            Recargar
          </Link>
        </p>
      )}
    </li>
  );
}
