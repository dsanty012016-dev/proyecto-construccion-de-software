import type { Metadata } from "next";
import Link from "next/link";
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
import { IconoAtras, IconoCandado, IconoTelefono } from "@/app/ui/comun/iconos-app";
import { Mapa } from "@/app/ui/comun/mapa";
import { PasosViaje } from "@/app/ui/comun/pasos-viaje";
import { RutaCorta } from "@/app/ui/comun/ruta-viaje";
import { TarjetaOferta } from "@/app/ui/estudiante/tarjeta-oferta";

export const metadata: Metadata = { title: "Tu viaje" };

// El viaje del estudiante (rediseño): primero elige entre las ofertas; cuando
// acepta una, ve al conductor con su placa grande hasta llegar a la U.
export default async function PaginaViajeEstudiante() {
  const { usuario } = await exigirRol("estudiante");
  const [activo, saldo] = await Promise.all([viajeActivoDelEstudiante(usuario.id), miSaldo(usuario.id)]);
  if (!activo) redirect("/estudiante");
  const { viaje, ofertas, conductor } = activo;
  const origen = { lat: viaje.origen_lat, lng: viaje.origen_lng };
  const destino = { lat: viaje.destino_lat, lng: viaje.destino_lng };
  // Ofertas nuevas y cambios de estado llegan en tiempo real (RLS decide qué ve).
  const enVivo = <EnVivo escuchas={[{ tabla: "viajes", filtro: `id=eq.${viaje.id}` }, { tabla: "ofertas", filtro: `viaje_id=eq.${viaje.id}` }]} />;

  if (viaje.estado === "solicitado") {
    return (
      <main className="flex min-h-[calc(100dvh-6rem)] flex-col px-5 pt-4">
        {enVivo}
        <EncabezadoPantalla
          titulo={ofertas.length > 0 ? "Elige tu conductor" : "Buscando conductores"}
          texto={
            ofertas.length > 0
              ? `${ofertas.length} ${ofertas.length === 1 ? "oferta" : "ofertas"} · siguen llegando`
              : "Las ofertas aparecen aquí sin recargar"
          }
          volverA="/estudiante"
        />
        <div className="mt-4">
          <RutaCorta origen={viaje.origen_texto} destino={viaje.destino_texto} />
        </div>

        {ofertas.length === 0 ? (
          <p role="status" className="mt-6 text-center text-texto-suave">
            Todavía no hay ofertas. Apenas un conductor te escriba su precio, aparece aquí.
          </p>
        ) : (
          <section aria-labelledby="titulo-ofertas" className="mt-2">
            <h2 id="titulo-ofertas" className="sr-only">
              Ofertas, de menor a mayor precio
            </h2>
            <ul>
              {ofertas.map((oferta, i) => (
                <TarjetaOferta key={oferta.ofertaId} oferta={oferta} saldo={saldo} destacada={i === 0} />
              ))}
            </ul>
          </section>
        )}

        <div className="mt-auto space-y-2 border-t border-texto-suave/15 pt-4">
          <p className="flex gap-2.5 text-[13px] leading-relaxed text-texto-suave">
            <IconoCandado className="mt-0.5 size-[18px] shrink-0 text-secundario" />
            Pagas al aceptar con tu saldo ({pesos(saldo)}). El conductor recibe el dinero cuando llegues.
          </p>
          <BotonAccion accion={cancelarViaje} campos={{ viaje: viaje.id }} estilo="discreto" confirmar="¿Cancelar la solicitud?">
            Cancelar la solicitud
          </BotonAccion>
        </div>
      </main>
    );
  }

  // Aceptado o en curso.
  const perfil = conductor?.perfil;
  const vehiculo = conductor?.vehiculo;
  const nombre = perfil ? nombreCorto(perfil.nombre) : "Tu conductor";
  const titulo = viaje.estado === "aceptado" ? `${nombre} va por ti` : "Rumbo a la U";
  return (
    <main>
      {enVivo}
      <div className="relative h-72">
        <Mapa etiqueta="Mapa del viaje" centro={origen} origen={origen} destino={destino} aRas className="h-full" />
        <Link
          href="/estudiante"
          aria-label="Volver al inicio"
          className="absolute top-4 left-4 z-10 flex size-11 items-center justify-center rounded-full bg-fondo text-texto"
        >
          <IconoAtras className="size-5" />
        </Link>
      </div>

      <div className="relative -mt-5 space-y-5 rounded-t-3xl bg-fondo px-5 pt-5">
        <div role="status">
          <h1 className="text-[26px] tracking-tight">{titulo}</h1>
          <p className="mt-1 text-sm text-texto-suave">
            <span className="sr-only">{etiquetaEstado(viaje.estado)}. </span>
            {viaje.estado === "aceptado" ? `Te recoge en ${viaje.origen_texto}` : `Vas a ${viaje.destino_texto}`}
          </p>
        </div>
        <PasosViaje estado={viaje.estado as "aceptado" | "en_curso"} />

        <section aria-labelledby="titulo-conductor" className="space-y-3.5 rounded-2xl bg-superficie p-4">
          <h2 id="titulo-conductor" className="sr-only">
            Tu conductor
          </h2>
          <div className="flex items-center gap-3">
            <Avatar nombre={perfil?.nombre ?? "Conductor"} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">
                {nombre}
                {perfil && ` · ${perfil.total_calificaciones > 0 ? `★ ${calificacionTexto(perfil.calificacion)}` : "Nuevo"}`}
              </p>
              {vehiculo && (
                <p className="text-[13px] text-texto-suave">
                  {vehiculo.marca} {vehiculo.modelo} {vehiculo.color}
                </p>
              )}
            </div>
            {conductor?.telefono && (
              <a
                href={`tel:${conductor.telefono}`}
                aria-label={`Llamar a ${nombre}`}
                className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primario text-texto hover:bg-primario/85"
              >
                <IconoTelefono className="size-[22px]" />
              </a>
            )}
          </div>
          {vehiculo && (
            <div className="flex items-center justify-between gap-3 border-t border-texto-suave/15 pt-3.5">
              <span className="text-[13px] text-texto-suave">Busca la placa</span>
              <span className="rounded-lg bg-texto px-3 py-1 font-titulo text-2xl font-bold tracking-[0.08em] text-fondo">{vehiculo.placa}</span>
            </div>
          )}
        </section>

        {viaje.pago_retenido > 0 && (
          <p className="flex justify-between text-sm">
            <span className="text-texto-suave">Pagado, retenido hasta llegar</span>
            <strong className="font-titulo tabular-nums">{pesos(viaje.pago_retenido)}</strong>
          </p>
        )}

        {viaje.estado === "aceptado" && <CancelarViaje viajeId={viaje.id} quien="estudiante" precio={viaje.pago_retenido} />}
      </div>
    </main>
  );
}
