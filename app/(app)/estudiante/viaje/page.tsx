import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cancelarViaje } from "@/app/lib/acciones-viaje";
import { miSaldo } from "@/app/lib/consultas-billetera";
import { viajeActivoDelEstudiante } from "@/app/lib/consultas-viaje";
import { calificacionTexto, etiquetaEstado, nombreCorto, pesos } from "@/app/lib/formato";
import { exigirRol } from "@/app/lib/sesion";
import { Avatar } from "@/app/ui/comun/avatar";
import { BotonAccion } from "@/app/ui/comun/boton-accion";
import { CancelarViaje } from "@/app/ui/comun/cancelar-viaje";
import { EncabezadoPantalla } from "@/app/ui/comun/encabezado-pantalla";
import { EnVivo } from "@/app/ui/comun/en-vivo";
import { IconoEstrella, IconoTelefono } from "@/app/ui/comun/iconos-app";
import { Mapa } from "@/app/ui/comun/mapa";
import { PasosViaje } from "@/app/ui/comun/pasos-viaje";
import { RutaViaje } from "@/app/ui/comun/ruta-viaje";
import { TarjetaOferta } from "@/app/ui/estudiante/tarjeta-oferta";

export const metadata: Metadata = { title: "Tu viaje" };

// El viaje del estudiante: primero las ofertas de los conductores; cuando
// acepta una, el seguimiento hasta que el conductor termina el viaje.
export default async function PaginaViajeEstudiante() {
  const { usuario } = await exigirRol("estudiante");
  const [activo, saldo] = await Promise.all([viajeActivoDelEstudiante(usuario.id), miSaldo(usuario.id)]);
  if (!activo) redirect("/estudiante");
  const { viaje, ofertas, conductor } = activo;
  const origen = { lat: viaje.origen_lat, lng: viaje.origen_lng };
  const destino = { lat: viaje.destino_lat, lng: viaje.destino_lng };
  // Ofertas nuevas y cambios de estado llegan en tiempo real (RLS decide qué ve).
  const enVivo = <EnVivo escuchas={[{ tabla: "viajes", filtro: `id=eq.${viaje.id}` }, { tabla: "ofertas", filtro: `viaje_id=eq.${viaje.id}` }]} />;
  const mapa = <Mapa etiqueta="Mapa del viaje" centro={origen} origen={origen} destino={destino} className="h-52" />;

  if (viaje.estado === "solicitado") {
    return (
      <main className="space-y-6 px-5 pt-6">
        {enVivo}
        <EncabezadoPantalla titulo={ofertas.length > 0 ? "Elige una oferta" : "Buscando conductores"} volverA="/estudiante" />
        {mapa}
        <div className="rounded-2xl bg-superficie p-4">
          <RutaViaje origen={viaje.origen_texto} destino={viaje.destino_texto} />
        </div>

        {ofertas.length === 0 ? (
          <p role="status" className="rounded-2xl border border-texto-suave/25 p-5 text-center text-texto-suave">
            Todavía no hay ofertas. Apenas un conductor te escriba su precio, aparecerá aquí sin recargar.
          </p>
        ) : (
          <section aria-labelledby="titulo-ofertas" className="space-y-3">
            <p className="text-sm text-texto-suave">
              Tu saldo: <span className="font-semibold text-texto">{pesos(saldo)}</span>. Pagas al aceptar una oferta.
            </p>
            <h2 id="titulo-ofertas" className="text-sm font-semibold text-texto-suave">
              {ofertas.length} {ofertas.length === 1 ? "oferta" : "ofertas"}, de menor a mayor precio
            </h2>
            <ul className="space-y-3">
              {ofertas.map((oferta) => (
                <TarjetaOferta key={oferta.ofertaId} oferta={oferta} saldo={saldo} />
              ))}
            </ul>
          </section>
        )}

        <BotonAccion accion={cancelarViaje} campos={{ viaje: viaje.id }} estilo="borde" confirmar="¿Cancelar la solicitud?">
          Cancelar solicitud
        </BotonAccion>
      </main>
    );
  }

  // Aceptado o en curso.
  const perfil = conductor?.perfil;
  const vehiculo = conductor?.vehiculo;
  return (
    <main className="space-y-5 px-5 pt-6">
      {enVivo}
      <EncabezadoPantalla titulo={etiquetaEstado(viaje.estado)} volverA="/estudiante" />
      <PasosViaje estado={viaje.estado as "aceptado" | "en_curso"} />
      {mapa}

      <div className="rounded-2xl bg-superficie p-4">
        <RutaViaje origen={viaje.origen_texto} destino={viaje.destino_texto} />
      </div>

      <section aria-labelledby="titulo-conductor" className="space-y-4 rounded-2xl bg-superficie p-4">
        <h2 id="titulo-conductor" className="sr-only">
          Tu conductor
        </h2>
        <div className="flex items-center gap-3">
          <Avatar nombre={perfil?.nombre ?? "Conductor"} grande />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">{perfil ? nombreCorto(perfil.nombre) : "Tu conductor"}</p>
            {perfil && (
              <p className="flex items-center gap-1 text-sm text-texto-suave">
                <IconoEstrella llena className="size-4 text-secundario" />
                {perfil.total_calificaciones > 0 ? calificacionTexto(perfil.calificacion) : "Nuevo"} · {perfil.viajes_terminados}{" "}
                {perfil.viajes_terminados === 1 ? "viaje" : "viajes"}
              </p>
            )}
          </div>
          {viaje.precio !== null && <p className="font-titulo text-xl font-bold">{pesos(viaje.precio)}</p>}
        </div>
        {vehiculo && (
          <div className="flex items-center justify-between gap-3 border-t border-texto-suave/20 pt-4">
            <p className="text-sm text-texto-suave">
              {vehiculo.marca} {vehiculo.modelo} · {vehiculo.color}
            </p>
            <p className="rounded-lg bg-texto px-3 py-1 font-titulo text-base font-bold tracking-wider text-fondo">{vehiculo.placa}</p>
          </div>
        )}
        {conductor?.telefono && (
          <a
            href={`tel:${conductor.telefono}`}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-texto-suave/30 font-semibold text-texto hover:bg-fondo"
          >
            <IconoTelefono className="size-5" />
            Llamar al conductor
          </a>
        )}
      </section>

      {viaje.estado === "aceptado" && <CancelarViaje viajeId={viaje.id} quien="estudiante" precio={viaje.pago_retenido} />}
    </main>
  );
}
