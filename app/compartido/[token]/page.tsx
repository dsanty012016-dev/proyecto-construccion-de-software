import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cupoCompartido, viajeCompartido } from "@/app/lib/consultas-seguimiento";
import { fechaCorta } from "@/app/lib/formato";
import type { Coordenada } from "@/app/lib/mapa";
import { textoUbicacion, viajeSeSigue } from "@/app/lib/seguimiento";
import { Mapa } from "@/app/ui/comun/mapa";
import { PasosViaje } from "@/app/ui/comun/pasos-viaje";
import { RutaViaje } from "@/app/ui/comun/ruta-viaje";
import { RefrescarCada } from "@/app/ui/compartido/refrescar-cada";

// Página pública del enlace "Compartir viaje" (013 y 014): quien lo reciba ve
// el viaje por pedido, o el viaje de un estudiante en un cupo, en vivo y sin
// iniciar sesión. Solo nombres cortos, vehículo, placa, recorrido y la
// ubicación del conductor; nada de teléfonos. Cuando termina o se cancela, la
// base deja de dar los datos y aquí solo se dice eso.

export const metadata: Metadata = {
  title: "Viaje compartido",
  robots: { index: false, follow: false },
};

/** Lo que la pantalla necesita, venga de un viaje o de un cupo. */
interface Vista {
  activo: boolean;
  terminado: boolean;
  titulo: string;
  detalle: string | null;
  pasos: "aceptado" | "en_curso" | null;
  origen: Coordenada | null;
  destino: Coordenada | null;
  vehiculo: Coordenada | null;
  origenTexto: string | null;
  destinoTexto: string | null;
  conductor: string | null;
  vehiculoTexto: string | null;
  placa: string | null;
  estudiante: string;
  ubicacionEn: string | null;
}

function punto(lat: number | null, lng: number | null): Coordenada | null {
  return lat !== null && lng !== null ? { lat, lng } : null;
}

async function cargar(token: string): Promise<{ vista: Vista; ahora: number } | null> {
  const deViaje = await viajeCompartido(token);
  if (deViaje) {
    const { viaje: v, ahora } = deViaje;
    const estudiante = v.estudiante || "El estudiante";
    return {
      ahora,
      vista: {
        activo: viajeSeSigue(v.estado),
        terminado: v.estado === "terminado",
        titulo: v.estado === "aceptado" ? `${v.conductor ?? "El conductor"} va por ${estudiante}` : `${estudiante} va camino a la U`,
        detalle: null,
        pasos: v.estado === "aceptado" || v.estado === "en_curso" ? v.estado : null,
        origen: punto(v.origen_lat, v.origen_lng),
        destino: punto(v.destino_lat, v.destino_lng),
        vehiculo: punto(v.ubicacion_lat, v.ubicacion_lng),
        origenTexto: v.origen_texto,
        destinoTexto: v.destino_texto,
        conductor: v.conductor,
        vehiculoTexto: v.vehiculo,
        placa: v.placa,
        estudiante,
        ubicacionEn: v.ubicacion_en,
      },
    };
  }

  const deCupo = await cupoCompartido(token);
  if (!deCupo) return null;
  const { cupo: c, ahora } = deCupo;
  const estudiante = c.estudiante || "El estudiante";
  const enCamino = c.estado === "en_curso";
  return {
    ahora,
    vista: {
      activo: c.activo,
      terminado: c.estado === "terminado",
      titulo: enCamino ? `${estudiante} va en el cupo de ${c.conductor ?? "su conductor"}` : `${estudiante} tiene puesto en un cupo`,
      detalle: !enCamino && c.sale_en ? `Sale ${fechaCorta(c.sale_en)}. Verás al conductor en el mapa cuando arranque.` : null,
      pasos: null,
      origen: punto(c.recogida_lat, c.recogida_lng),
      destino: punto(c.destino_lat, c.destino_lng),
      vehiculo: punto(c.ubicacion_lat, c.ubicacion_lng),
      origenTexto: c.recogida_texto,
      destinoTexto: c.destino_texto,
      conductor: c.conductor,
      vehiculoTexto: c.vehiculo,
      placa: c.placa,
      estudiante,
      ubicacionEn: enCamino ? c.ubicacion_en : null,
    },
  };
}

export default async function PaginaViajeCompartido({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resultado = await cargar(token);
  if (!resultado) notFound();
  const { vista, ahora } = resultado;

  const encabezado = (
    <header className="flex items-center justify-between gap-3 px-5 pt-4">
      <Image src="/brand/logo-oscuro.png" alt="UniGo" width={91} height={32} className="h-8 w-auto" priority />
      <span className="text-[13px] font-semibold text-texto-suave">Viaje compartido</span>
    </header>
  );

  if (!vista.activo) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-md">
        {encabezado}
        <div className="space-y-3 px-5 pt-16 text-center">
          <h1 className="text-2xl tracking-tight">{vista.terminado ? "Este viaje ya terminó" : "Este viaje ya no está activo"}</h1>
          <p className="text-sm text-texto-suave">Por privacidad, el enlace deja de mostrar el recorrido cuando el viaje termina o se cancela.</p>
          <Link href="/" className="inline-flex min-h-11 items-center font-semibold">
            Conoce UniGo
          </Link>
        </div>
      </main>
    );
  }

  const senal = textoUbicacion(vista.ubicacionEn ? Date.parse(vista.ubicacionEn) : null, ahora);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md pb-8">
      <RefrescarCada segundos={5} />
      {encabezado}
      <div className="relative mt-4 h-72">
        {vista.origen && (
          <Mapa
            etiqueta="Mapa del viaje compartido"
            centro={vista.origen}
            origen={vista.origen}
            destino={vista.destino}
            vehiculo={vista.vehiculo}
            aRas
            className="h-full"
          />
        )}
        <p className="absolute top-4 right-4 z-10 flex items-center gap-2 rounded-full bg-fondo px-3 py-2 text-xs font-semibold">
          <span aria-hidden="true" className={`size-2 rounded-full ${senal === "Ubicación en vivo" ? "bg-secundario motion-safe:animate-pulse" : "bg-texto-suave"}`} />
          {senal}
        </p>
      </div>

      <div className="relative -mt-5 space-y-5 rounded-t-3xl bg-fondo px-5 pt-5">
        <div role="status" className="space-y-1">
          <h1 className="text-[26px] tracking-tight">{vista.titulo}</h1>
          {vista.detalle && <p className="text-sm text-texto-suave">{vista.detalle}</p>}
        </div>
        {vista.pasos && <PasosViaje estado={vista.pasos} />}
        {vista.origenTexto && vista.destinoTexto && (
          <RutaViaje origen={vista.origenTexto} destino={vista.destinoTexto} etiquetaOrigen="Recogida" etiquetaDestino="Destino" />
        )}
        {(vista.vehiculoTexto || vista.placa) && (
          <section aria-label="Vehículo" className="flex items-center justify-between gap-3 rounded-2xl bg-superficie p-4">
            <span className="min-w-0">
              <span className="block font-bold">{vista.conductor ?? "Conductor"}</span>
              {vista.vehiculoTexto && <span className="block text-[13px] text-texto-suave">{vista.vehiculoTexto}</span>}
            </span>
            {vista.placa && (
              <span className="shrink-0 rounded-lg bg-texto px-3 py-1 font-titulo text-xl font-bold tracking-[0.08em] text-fondo">{vista.placa}</span>
            )}
          </section>
        )}
        <p className="text-[13px] leading-relaxed text-texto-suave">
          {vista.estudiante} compartió este viaje contigo. Se actualiza solo y deja de mostrarse cuando el viaje termina.
        </p>
      </div>
    </main>
  );
}
