import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { destinoDeRecarga } from "@/app/lib/retorno-recarga";
import { compartirViaje } from "@/app/lib/acciones-seguimiento";
import { cancelarViaje } from "@/app/lib/acciones-viaje";
import { miSaldo } from "@/app/lib/consultas-billetera";
import { ubicacionConHora } from "@/app/lib/consultas-seguimiento";
import { viajeActivoDelEstudiante } from "@/app/lib/consultas-viaje";
import { etiquetaEstado, nombreCorto, pesos } from "@/app/lib/formato";
import { exigirRol } from "@/app/lib/sesion";
import { Avatar } from "@/app/ui/comun/avatar";
import { EnlaceDeAyuda } from "@/app/ui/comun/ayuda-unigo";
import { BotonAccion } from "@/app/ui/comun/boton-accion";
import { BotonEmergencia } from "@/app/ui/comun/boton-emergencia";
import { CancelarViaje } from "@/app/ui/comun/cancelar-viaje";
import { EncabezadoPantalla } from "@/app/ui/comun/encabezado-pantalla";
import { EnVivo } from "@/app/ui/comun/en-vivo";
import { IconoAtras, IconoCandado, IconoTelefono } from "@/app/ui/comun/iconos-app";
import { PasosViaje } from "@/app/ui/comun/pasos-viaje";
import { RutaCorta } from "@/app/ui/comun/ruta-viaje";
import { BotonCompartirViaje } from "@/app/ui/estudiante/boton-compartir-viaje";
import { MapaEnVivo } from "@/app/ui/estudiante/mapa-en-vivo";
import { PALABRAS } from "@/app/lib/sentido";
import { horaDe, venceSolicitud } from "@/app/lib/vencimientos";
import { TarjetaOferta } from "@/app/ui/estudiante/tarjeta-oferta";
import { Nota } from "@/app/ui/comun/nota";
import { Placa } from "@/app/ui/comun/placa";

export const metadata: Metadata = { title: "Tu viaje" };

// El viaje del estudiante (rediseño): primero elige entre las ofertas; cuando
// acepta una, ve al conductor con su placa grande hasta llegar a la U (o a
// casa, en el regreso).
export default async function PaginaViajeEstudiante({ searchParams }: { searchParams: Promise<{ viaje?: string | string[] }> }) {
  const buscado = (await searchParams).viaje;
  const retornoValido = typeof buscado === "string" && destinoDeRecarga(`/estudiante/viaje?viaje=${buscado}`);
  const idBuscado = retornoValido ? retornoValido.split("?viaje=")[1] : null;
  const { usuario } = await exigirRol("estudiante");
  const [activo, saldo] = await Promise.all([viajeActivoDelEstudiante(usuario.id), miSaldo(usuario.id)]);
  if (idBuscado && (!activo || activo.viaje.id !== idBuscado)) return <main className="space-y-4 px-5 pt-6">
    <h1 className="cartel text-[2.125rem]">Revisa tu viaje</h1>
    <p role="status">El viaje desde el que fuiste a recargar ya no está activo. Consulta tu billetera para ver el saldo y revisa tu inicio antes de pedir otro.</p>
    <Link href="/estudiante" className="flex min-h-12 items-center justify-center rounded-xl bg-primario px-4 py-3 font-semibold text-sobre-primario">Volver a mi inicio</Link>
    <Link href="/billetera" className="inline-flex min-h-11 items-center text-secundario">Consultar mi billetera</Link>
  </main>;
  if (!activo) redirect("/estudiante");
  const { viaje, ofertas, conductor } = activo;
  const origen = { lat: viaje.origen_lat, lng: viaje.origen_lng };
  const destino = { lat: viaje.destino_lat, lng: viaje.destino_lng };
  // Ofertas nuevas y cambios de estado llegan en tiempo real (RLS decide qué ve).
  const enVivo = <EnVivo escuchas={[{ tabla: "viajes", filtro: `id=eq.${viaje.id}` }, { tabla: "ofertas", filtro: `viaje_id=eq.${viaje.id}` }]} />;

  if (viaje.estado === "solicitado") {
    return (
      <main className="space-y-5 px-5 pt-4">
        {enVivo}
        <EncabezadoPantalla
          titulo={ofertas.length > 0 ? "Elige tu conductor" : "Buscando conductores"}
          texto={ofertas.length > 0 ? "Pagas al aceptar; la más barata va primero" : "Las ofertas aparecen aquí sin recargar"}
          volverA="/estudiante"
        />
        {ofertas.length === 0 ? (
          <>
            <div className="mt-4">
              <RutaCorta origen={viaje.origen_texto} destino={viaje.destino_texto} />
            </div>
            <p role="status" className="mt-6 text-lg leading-snug text-texto-suave">
              Todavía no hay ofertas. Apenas un conductor te escriba su precio, aparece aquí.
            </p>
          </>
        ) : (
          <section aria-labelledby="titulo-ofertas" className="producto-panel">
            <header className="oferta-cabecera">
              <h2 id="titulo-ofertas" className="cifra text-xl">
                {ofertas.length} {ofertas.length === 1 ? "oferta" : "ofertas"}
                <span className="sr-only">, de menor a mayor precio</span>
              </h2>
              <p className="min-w-0 text-sm leading-snug text-texto-suave">
                <span className="block [overflow-wrap:anywhere]">
                  {viaje.sentido === "regreso" ? `De la U a ${viaje.destino_texto}` : `De ${viaje.origen_texto} a la U`}
                </span>
              </p>
            </header>
            <ul className="px-4">
              {ofertas.map((oferta, i) => (
                <TarjetaOferta key={oferta.ofertaId} oferta={oferta} saldo={saldo} viajeId={viaje.id} destacada={i === 0} />
              ))}
            </ul>
          </section>
        )}

        <div className="space-y-2 border-t border-linea pt-4">
          <p className="flex gap-2.5 text-[13px] leading-relaxed text-texto-suave">
            <IconoCandado className="mt-0.5 size-[18px] shrink-0 text-secundario" />
            Pagas al aceptar con tu saldo ({pesos(saldo)}). El conductor recibe el dinero cuando llegues.
          </p>
          <p className="text-[13px] text-texto-suave">
            Si no aceptas una oferta antes de las {horaDe(venceSolicitud(Date.parse(viaje.creado_en)))}, la solicitud se cancela sola.
          </p>
          <BotonAccion accion={cancelarViaje} campos={{ viaje: viaje.id }} estilo="discreto" textoSi="Sí, cancelar" confirmar="¿Cancelar la solicitud?">
            Cancelar la solicitud
          </BotonAccion>
        </div>
      </main>
    );
  }

  // Aceptado o en curso: con el conductor en vivo en el mapa.
  const { ubicacion, ahora } = await ubicacionConHora(viaje.id);
  const perfil = conductor?.perfil;
  const vehiculo = conductor?.vehiculo;
  const nombre = perfil ? nombreCorto(perfil.nombre) : "Tu conductor";
  const titulo = viaje.estado === "aceptado" ? `${nombre} va por ti` : PALABRAS[viaje.sentido].titulo;
  return (
    <main>
      {enVivo}
      <div className="relative">
        <MapaEnVivo
          fuente={{ tabla: "ubicaciones_viaje", columna: "viaje_id", id: viaje.id }}
          origen={origen}
          destino={destino}
          inicial={ubicacion ? { lat: ubicacion.lat, lng: ubicacion.lng, actualizado_en: ubicacion.actualizado_en } : null}
          ahoraInicial={ahora}
          uEnElOrigen={viaje.sentido === "regreso"}
        />
        <Link
          href="/estudiante"
          aria-label="Volver al inicio"
          className="absolute top-4 left-4 z-10 flex size-11 items-center justify-center rounded-full bg-fondo text-texto"
        >
          <IconoAtras className="size-5" />
        </Link>
      </div>

      <div className="relative -mt-5 space-y-5 rounded-t-3xl bg-fondo px-5 pt-5">
        <BotonEmergencia viaje={viaje.id} compartir={compartirViaje.bind(null, viaje.id)} />
        <div className="trayecto-panel space-y-4">
          <div role="status">
            <div key={viaje.estado} className="trayecto-hito">
              <h1 className="cartel text-[2.25rem]">{titulo}</h1>
              <p className="mt-1 text-sm text-texto-suave">
                <span className="sr-only">{etiquetaEstado(viaje.estado)}. </span>
                {viaje.estado === "aceptado" ? `Te recoge en ${viaje.origen_texto}` : `Vas a ${viaje.destino_texto}`}
              </p>
            </div>
          </div>
          <PasosViaje estado={viaje.estado as "aceptado" | "en_curso"} regreso={viaje.sentido === "regreso"} />
        </div>

        <section aria-labelledby="titulo-conductor" className="producto-panel space-y-3.5 p-4">
          <h2 id="titulo-conductor" className="sr-only">
            Tu conductor
          </h2>
          <div className="flex items-center gap-3">
            <Avatar nombre={perfil?.nombre ?? "Conductor"} sobreTarjeta />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">
                {nombre}
                {perfil && (
                  <>
                    {" · "}
                    <Nota promedio={perfil.calificacion} total={perfil.total_calificaciones} />
                  </>
                )}
              </p>
              {vehiculo && (
                <p className="text-[13px] text-texto-suave">
                  {vehiculo.marca} {vehiculo.modelo}, {vehiculo.color}
                </p>
              )}
            </div>
            {conductor?.telefono && (
              <a
                href={`tel:${conductor.telefono}`}
                aria-label={`Llamar a ${nombre}`}
                className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primario text-sobre-primario hover:bg-primario/85"
              >
                <IconoTelefono className="size-[22px]" />
              </a>
            )}
          </div>
          {vehiculo && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-texto-suave/40 pt-3.5">
              <span className="text-[13px] leading-snug text-texto-suave">
                Busca
                <br />
                la placa
              </span>
              <Placa placa={vehiculo.placa} grande />
            </div>
          )}
        </section>

        {viaje.pago_retenido > 0 && (
          <p className="flex items-baseline justify-between text-sm">
            <span className="text-texto-suave">Pagado, retenido hasta llegar</span>
            <strong className="cifra text-xl">{pesos(viaje.pago_retenido)}</strong>
          </p>
        )}

        <BotonCompartirViaje compartir={compartirViaje.bind(null, viaje.id)} />
        <EnlaceDeAyuda motivo={{ tipo: "viaje", referencia: viaje.id }} />

        {viaje.estado === "aceptado" && <CancelarViaje viajeId={viaje.id} quien="estudiante" precio={viaje.pago_retenido} />}
      </div>
    </main>
  );
}
