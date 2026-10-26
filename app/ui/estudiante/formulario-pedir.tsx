"use client";

import { useActionState, useState } from "react";
import { pedirViaje } from "@/app/lib/acciones-viaje";
import { ESTADO_INICIAL } from "@/app/lib/estado-formulario";
import { type Coordenada, distanciaKm, distanciaTexto, redondear } from "@/app/lib/mapa";
import { cercaDeLaU, DISTANCIA_MINIMA_KM, esSentido, PALABRAS, type Sentido } from "@/app/lib/sentido";
import { Aviso, BotonEnviar, Campo } from "@/app/ui/auth/campos";
import { IconoCheck, IconoUbicacion } from "@/app/ui/comun/iconos-app";
import { Mapa } from "@/app/ui/comun/mapa";
import { PuntoEnLaU } from "@/app/ui/comun/punto-en-la-u";
import { RutaViaje } from "@/app/ui/comun/ruta-viaje";
import { SelectorSentido } from "@/app/ui/comun/selector-sentido";
import { useUbicacion } from "@/app/ui/comun/use-ubicacion";

// Formulario para pedir un viaje a la U (ida) o de la U a la casa (regreso).
// El punto del estudiante se elige en el mapa (moviendo el mapa hasta dejar
// el pin encima, o tocando un sitio): en la ida es donde lo recogen y en el
// regreso donde se baja. En el regreso, además, el punto en la U (la sede o
// uno cercano). La ubicación del celular es solo un atajo.

interface Sede {
  nombre: string;
  lat: number;
  lng: number;
}

export function FormularioPedir({ sede, sentidoInicial = "ida" }: { sede: Sede; sentidoInicial?: Sentido }) {
  const [estado, accion] = useActionState(pedirViaje, ESTADO_INICIAL);
  const errores = estado.errores ?? {};
  const valores = estado.valores ?? {};
  const [sentido, setSentido] = useState<Sentido>(esSentido(valores.sentido) ? valores.sentido : sentidoInicial);
  const [punto, setPunto] = useState<Coordenada | null>(null);
  const [puntoU, setPuntoU] = useState<Coordenada | null>(null);
  const [irA, setIrA] = useState<Coordenada | null>(null);
  const ubicacion = useUbicacion((aqui) => {
    setIrA(aqui);
    setPunto(aqui);
  });

  const centroSede = { lat: sede.lat, lng: sede.lng };
  const regreso = sentido === "regreso";
  const enLaU = regreso && puntoU ? puntoU : centroSede;
  const distancia = punto ? distanciaKm(punto, enLaU) : null;
  const muyCerca = distancia !== null && distancia < DISTANCIA_MINIMA_KM;
  const uValido = !regreso || puntoU === null || cercaDeLaU(puntoU, centroSede);
  const listo = punto !== null && !muyCerca && uValido;
  const guardado = punto ? redondear(punto) : null;
  const palabras = PALABRAS[sentido];

  return (
    <form action={accion} className="space-y-6" noValidate>
      {estado.resultado === "error" && estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}

      <SelectorSentido valor={sentido} alCambiar={setSentido} pregunta="¿Para dónde vas?" />
      {errores.sentido && <Aviso tipo="error">{errores.sentido}</Aviso>}

      <section aria-labelledby="titulo-punto" className="space-y-3">
        <div>
          <h2 id="titulo-punto" className="text-base">
            1. {palabras.preguntaEstudiante}
          </h2>
          <p id="ayuda-mapa" className="text-sm text-texto-suave">
            {regreso
              ? "Mueve el mapa hasta que el pin quede donde te bajas, o toca el sitio."
              : "Mueve el mapa hasta que el pin quede en tu punto de recogida, o toca el sitio."}
          </p>
        </div>

        <Mapa
          etiqueta={regreso ? "Mapa para elegir dónde te bajas" : "Mapa para elegir el punto de recogida"}
          centro={centroSede}
          destino={centroSede}
          alElegir={setPunto}
          irA={irA}
          className="h-72"
        />

        <p role="status" className={`flex items-center gap-2 text-sm ${muyCerca ? "text-error" : "text-texto"}`}>
          {punto && !muyCerca && <IconoCheck className="size-5 shrink-0 text-secundario" />}
          {!punto
            ? "Todavía no has elegido el punto."
            : muyCerca
              ? regreso
                ? "Ese punto es la universidad. Mueve el mapa hasta a donde vas."
                : "Ese punto es la universidad. Mueve el mapa hasta donde estás."
              : `Punto elegido · a ${distanciaTexto(distancia ?? 0)} de la universidad en línea recta.`}
        </p>
        {ubicacion.estado.paso === "error" && <Aviso tipo="error">{ubicacion.estado.mensaje}</Aviso>}
        {errores.punto_lat && <Aviso tipo="error">{errores.punto_lat}</Aviso>}

        <button
          type="button"
          onClick={ubicacion.pedir}
          disabled={ubicacion.estado.paso === "buscando"}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-texto-suave/30 font-semibold text-texto transition-colors hover:bg-superficie disabled:opacity-70"
        >
          <IconoUbicacion className="size-5" />
          {ubicacion.estado.paso === "buscando" ? "Buscando tu ubicación…" : "Usar mi ubicación actual"}
        </button>
        <input type="hidden" name="punto_lat" value={guardado?.lat ?? ""} />
        <input type="hidden" name="punto_lng" value={guardado?.lng ?? ""} />
      </section>

      <section aria-labelledby="titulo-direccion" className="space-y-4">
        <h2 id="titulo-direccion" className="text-base">
          2. {regreso ? "Dile al conductor a dónde vas" : "Ayuda al conductor a encontrarte"}
        </h2>
        <Campo
          etiqueta="Dirección o barrio"
          name="direccion"
          placeholder="Ej.: Cra. 33 #15-20, Barzal"
          defaultValue={valores.direccion}
          error={errores.direccion}
          maxLength={120}
          autoComplete="street-address"
        />
        <Campo
          etiqueta="Referencia (opcional)"
          name="referencia"
          placeholder="Ej.: frente a la panadería, portón azul"
          defaultValue={valores.referencia}
          error={errores.referencia}
          maxLength={70}
        />
      </section>

      {regreso && (
        <PuntoEnLaU
          sede={sede}
          titulo="3. ¿Dónde te recogen en la U?"
          ayuda="En la sede, o en otra portería o esquina cercana (máximo 500 m)."
          punto={puntoU}
          alCambiar={setPuntoU}
          referencia={valores.referencia_u}
          errorReferencia={errores.referencia_u}
          errorPunto={errores.u_lat}
        />
      )}

      <section aria-labelledby="titulo-destino" className="space-y-3 rounded-2xl bg-superficie p-4">
        <h2 id="titulo-destino" className="text-base">
          Tu viaje
        </h2>
        {regreso ? (
          <RutaViaje origen={puntoU ? `Cerca de ${sede.nombre}` : sede.nombre} destino="El punto que elegiste en el mapa" />
        ) : (
          <RutaViaje origen="El punto que elegiste en el mapa" destino={sede.nombre} />
        )}
        <p className="text-sm text-texto-suave">Los conductores te enviarán su precio. Tú eliges la oferta que más te sirva.</p>
      </section>

      <BotonEnviar enviando="Buscando conductores…" deshabilitado={!listo}>
        Buscar conductores
      </BotonEnviar>
      {!punto && (
        <p className="text-center text-sm text-texto-suave">
          {regreso ? "Primero elige en el mapa a dónde vas." : "Primero elige tu punto de recogida en el mapa."}
        </p>
      )}
    </form>
  );
}
