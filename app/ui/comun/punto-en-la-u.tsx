"use client";

import { useState } from "react";
import { type Coordenada, distanciaKm, distanciaTexto, redondear } from "@/app/lib/mapa";
import { RADIO_U_KM } from "@/app/lib/sentido";
import { Aviso, Campo } from "@/app/ui/auth/campos";
import { IconoCheck } from "@/app/ui/comun/iconos-app";
import { Mapa } from "@/app/ui/comun/mapa";

// El punto en la universidad para el regreso (017): por defecto es la sede;
// si la recogida es en otra portería o esquina, se elige en un mapa, a máximo
// 500 m. Manda u_lat, u_lng (vacíos = la sede) y referencia_u.

interface Props {
  sede: { nombre: string; lat: number; lng: number };
  titulo: string;
  ayuda: string;
  /** Lo que se elige: el punto, o null si es la sede. */
  punto: Coordenada | null;
  alCambiar: (punto: Coordenada | null) => void;
  referencia?: string;
  errorReferencia?: string;
  errorPunto?: string;
}

export function PuntoEnLaU({ sede, titulo, ayuda, punto, alCambiar, referencia, errorReferencia, errorPunto }: Props) {
  const [eligiendo, setEligiendo] = useState(punto !== null);
  const centro = { lat: sede.lat, lng: sede.lng };
  const distancia = punto ? distanciaKm(punto, centro) : 0;
  const muyLejos = distancia > RADIO_U_KM;
  const guardado = punto ? redondear(punto) : null;

  function usarSede() {
    setEligiendo(false);
    alCambiar(null);
  }

  return (
    <section aria-labelledby="titulo-punto-u" className="space-y-3">
      <div>
        <h2 id="titulo-punto-u" className="text-base">
          {titulo}
        </h2>
        <p className="text-sm text-texto-suave">{ayuda}</p>
      </div>

      {eligiendo ? (
        <>
          <Mapa
            etiqueta="Mapa para elegir el punto en la universidad"
            centro={centro}
            destino={centro}
            alElegir={alCambiar}
            className="h-56"
          />
          <p role="status" className={`flex items-center gap-2 text-sm ${muyLejos ? "text-error" : "text-texto"}`}>
            {punto && !muyLejos && <IconoCheck className="size-5 shrink-0 text-secundario" />}
            {!punto
              ? "Mueve el mapa hasta el punto donde te pueden recoger."
              : muyLejos
                ? `Ese punto está a ${distanciaTexto(distancia)} de la sede. Debe estar a máximo ${distanciaTexto(RADIO_U_KM)}.`
                : `A ${distanciaTexto(distancia)} de la sede.`}
          </p>
          <button
            type="button"
            onClick={usarSede}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-secundario hover:underline"
          >
            Mejor en la sede
          </button>
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-superficie p-4">
          <p className="min-w-0">
            <span className="block text-[13px] text-texto-suave">Punto en la U</span>
            <span className="font-bold break-words">{sede.nombre}</span>
          </p>
          <button
            type="button"
            onClick={() => setEligiendo(true)}
            className="inline-flex min-h-11 items-center rounded-xl border border-texto-suave/30 px-4 text-sm font-semibold text-texto transition-colors hover:bg-fondo"
          >
            Elegir otro punto
          </button>
        </div>
      )}
      {errorPunto && <Aviso tipo="error">{errorPunto}</Aviso>}

      <Campo
        etiqueta="¿En qué portería o esquina? (opcional)"
        name="referencia_u"
        placeholder="Ej.: portería principal"
        defaultValue={referencia}
        error={errorReferencia}
        maxLength={70}
      />
      <input type="hidden" name="u_lat" value={guardado?.lat ?? ""} />
      <input type="hidden" name="u_lng" value={guardado?.lng ?? ""} />
    </section>
  );
}

