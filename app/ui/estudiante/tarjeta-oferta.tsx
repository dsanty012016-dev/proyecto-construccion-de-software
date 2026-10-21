import { aceptarOferta } from "@/app/lib/acciones-viaje";
import type { ConductorConOferta } from "@/app/lib/consultas-viaje";
import Link from "next/link";
import { calificacionTexto, nombreCorto, pesos } from "@/app/lib/formato";
import { Avatar } from "@/app/ui/comun/avatar";
import { BotonAccion } from "@/app/ui/comun/boton-accion";
import { IconoEstrella } from "@/app/ui/comun/iconos-app";

// Una oferta de un conductor: quién es, su precio y su vehículo. Aceptarla
// cierra la búsqueda (la regla la hace cumplir aceptar_oferta en la base).
export function TarjetaOferta({ oferta, saldo }: { oferta: ConductorConOferta; saldo: number }) {
  const { conductor, vehiculo } = oferta;
  const nombre = nombreCorto(conductor.nombre);
  return (
    <li className="space-y-4 rounded-2xl bg-superficie p-4">
      <div className="flex items-center gap-3">
        <Avatar nombre={conductor.nombre} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold">{nombre}</p>
          <p className="flex items-center gap-1 text-sm text-texto-suave">
            <IconoEstrella llena className="size-4 text-secundario" />
            {conductor.total_calificaciones > 0 ? calificacionTexto(conductor.calificacion) : "Nuevo"} · {conductor.viajes_terminados}{" "}
            {conductor.viajes_terminados === 1 ? "viaje" : "viajes"}
          </p>
        </div>
        <p className="font-titulo text-xl font-bold">{pesos(oferta.precio)}</p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-sm text-texto-suave">
          {vehiculo ? `${vehiculo.marca} ${vehiculo.modelo} · ${vehiculo.color} · ${vehiculo.placa}` : "Vehículo sin registrar"}
        </p>
        <BotonAccion accion={aceptarOferta} campos={{ oferta: oferta.ofertaId }} estilo="pequeno" enviando="Aceptando…">
          <span aria-hidden="true">Aceptar</span>
          <span className="sr-only">
            Aceptar la oferta de {nombre} por {pesos(oferta.precio)}
          </span>
        </BotonAccion>
      </div>
      {saldo < oferta.precio && (
        <p className="text-sm text-texto-suave">
          Te faltan {pesos(oferta.precio - saldo)} para aceptarla. <Link href="/billetera">Recargar</Link>
        </p>
      )}
    </li>
  );
}
