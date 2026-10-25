import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { viajeCompartido } from "@/app/lib/consultas-seguimiento";
import { textoUbicacion, viajeSeSigue } from "@/app/lib/seguimiento";
import { Mapa } from "@/app/ui/comun/mapa";
import { PasosViaje } from "@/app/ui/comun/pasos-viaje";
import { RutaViaje } from "@/app/ui/comun/ruta-viaje";
import { RefrescarCada } from "@/app/ui/compartido/refrescar-cada";

// Página pública del enlace "Compartir viaje" (013): quien lo reciba ve el
// viaje en vivo sin iniciar sesión. Solo nombres cortos, vehículo, placa y la
// ubicación del conductor; nada de teléfonos. Cuando el viaje termina o se
// cancela, la base deja de dar los datos y aquí solo se dice eso.

export const metadata: Metadata = {
  title: "Viaje compartido",
  robots: { index: false, follow: false },
};

export default async function PaginaViajeCompartido({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resultado = await viajeCompartido(token);
  if (!resultado) notFound();
  const { viaje, ahora } = resultado;

  const encabezado = (
    <header className="flex items-center justify-between gap-3 px-5 pt-4">
      <Image src="/brand/logo-oscuro.png" alt="UniGo" width={91} height={32} className="h-8 w-auto" priority />
      <span className="text-[13px] font-semibold text-texto-suave">Viaje compartido</span>
    </header>
  );

  if (!viajeSeSigue(viaje.estado)) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-md">
        {encabezado}
        <div className="space-y-3 px-5 pt-16 text-center">
          <h1 className="text-2xl tracking-tight">{viaje.estado === "terminado" ? "Este viaje ya terminó" : "Este viaje ya no está activo"}</h1>
          <p className="text-sm text-texto-suave">Por privacidad, el enlace deja de mostrar el recorrido cuando el viaje termina o se cancela.</p>
          <Link href="/" className="inline-flex min-h-11 items-center font-semibold">
            Conoce UniGo
          </Link>
        </div>
      </main>
    );
  }

  const origen = viaje.origen_lat !== null && viaje.origen_lng !== null ? { lat: viaje.origen_lat, lng: viaje.origen_lng } : null;
  const destino = viaje.destino_lat !== null && viaje.destino_lng !== null ? { lat: viaje.destino_lat, lng: viaje.destino_lng } : null;
  const vehiculo = viaje.ubicacion_lat !== null && viaje.ubicacion_lng !== null ? { lat: viaje.ubicacion_lat, lng: viaje.ubicacion_lng } : null;
  const estudiante = viaje.estudiante || "El estudiante";
  const titulo = viaje.estado === "aceptado" ? `${viaje.conductor ?? "El conductor"} va por ${estudiante}` : `${estudiante} va camino a la U`;
  const senal = textoUbicacion(viaje.ubicacion_en ? Date.parse(viaje.ubicacion_en) : null, ahora);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md pb-8">
      <RefrescarCada segundos={5} />
      {encabezado}
      <div className="relative mt-4 h-72">
        {origen && (
          <Mapa etiqueta="Mapa del viaje compartido" centro={origen} origen={origen} destino={destino} vehiculo={vehiculo} aRas className="h-full" />
        )}
        <p className="absolute top-4 right-4 z-10 flex items-center gap-2 rounded-full bg-fondo px-3 py-2 text-xs font-semibold">
          <span aria-hidden="true" className={`size-2 rounded-full ${senal === "Ubicación en vivo" ? "bg-secundario motion-safe:animate-pulse" : "bg-texto-suave"}`} />
          {senal}
        </p>
      </div>

      <div className="relative -mt-5 space-y-5 rounded-t-3xl bg-fondo px-5 pt-5">
        <h1 role="status" className="text-[26px] tracking-tight">
          {titulo}
        </h1>
        <PasosViaje estado={viaje.estado as "aceptado" | "en_curso"} />
        {viaje.origen_texto && viaje.destino_texto && (
          <RutaViaje origen={viaje.origen_texto} destino={viaje.destino_texto} etiquetaOrigen="Recogida" etiquetaDestino="Destino" />
        )}
        {(viaje.vehiculo || viaje.placa) && (
          <section aria-label="Vehículo" className="flex items-center justify-between gap-3 rounded-2xl bg-superficie p-4">
            <span className="min-w-0">
              <span className="block font-bold">{viaje.conductor ?? "Conductor"}</span>
              {viaje.vehiculo && <span className="block text-[13px] text-texto-suave">{viaje.vehiculo}</span>}
            </span>
            {viaje.placa && (
              <span className="shrink-0 rounded-lg bg-texto px-3 py-1 font-titulo text-xl font-bold tracking-[0.08em] text-fondo">{viaje.placa}</span>
            )}
          </section>
        )}
        <p className="text-[13px] leading-relaxed text-texto-suave">
          {estudiante} compartió este viaje contigo. Se actualiza solo y deja de mostrarse cuando el viaje termina.
        </p>
      </div>
    </main>
  );
}
