import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { compartirViaje } from "@/app/lib/acciones-seguimiento";
import { cancelarViaje } from "@/app/lib/acciones-viaje";
import { miSaldo } from "@/app/lib/consultas-billetera";
import { ubicacionConHora } from "@/app/lib/consultas-seguimiento";
import { viajeActivoDelEstudiante } from "@/app/lib/consultas-viaje";
import { etiquetaEstado, nombreCorto, pesos } from "@/app/lib/formato";
import { exigirRol } from "@/app/lib/sesion";
import { Avatar } from "@/app/ui/comun/avatar";
import { BotonAccion } from "@/app/ui/comun/boton-accion";
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
          // El tiquete de ofertas: el mismo de la portada, ahora con ofertas de verdad.
          <section aria-labelledby="titulo-ofertas" className="mt-4 mb-5 rounded-2xl bg-superficie">
            <header className="relative flex items-end justify-between gap-4 border-b-2 border-dashed border-texto-suave/40 px-4 pt-4 pb-3 before:absolute before:-bottom-2.5 before:-left-2.5 before:size-5 before:rounded-full before:bg-fondo after:absolute after:-right-2.5 after:-bottom-2.5 after:size-5 after:rounded-full after:bg-fondo">
              <h2 id="titulo-ofertas" className="cifra text-[2rem]">
                {ofertas.length} {ofertas.length === 1 ? "oferta" : "ofertas"}
                <span className="sr-only">, de menor a mayor precio</span>
              </h2>
              <p className="min-w-0 text-right text-[13px] leading-snug text-texto-suave">
                <span className="block truncate">
                  {viaje.sentido === "regreso" ? `De la U a ${viaje.destino_texto}` : `De ${viaje.origen_texto} a la U`}
                </span>
                Siguen llegando
              </p>
            </header>
            <ul className="px-4">
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
          <p className="text-center text-[13px] text-texto-suave">
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
        <div role="status">
          <h1 className="cartel text-[2.25rem]">{titulo}</h1>
          <p className="mt-1 text-sm text-texto-suave">
            <span className="sr-only">{etiquetaEstado(viaje.estado)}. </span>
            {viaje.estado === "aceptado" ? `Te recoge en ${viaje.origen_texto}` : `Vas a ${viaje.destino_texto}`}
          </p>
        </div>
        <PasosViaje estado={viaje.estado as "aceptado" | "en_curso"} regreso={viaje.sentido === "regreso"} />

        <section aria-labelledby="titulo-conductor" className="space-y-3.5 rounded-2xl bg-superficie p-4">
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
            <div className="flex items-center justify-between gap-3 border-t border-dashed border-texto-suave/40 pt-3.5">
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

        {viaje.estado === "aceptado" && <CancelarViaje viajeId={viaje.id} quien="estudiante" precio={viaje.pago_retenido} />}
      </div>
    </main>
  );
}
