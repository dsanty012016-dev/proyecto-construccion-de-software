"use client";

import { useActionState, useId, useState } from "react";
import { publicarCupo } from "@/app/lib/acciones-cupo";
import { gananciaConductor, PORCENTAJE_COMISION } from "@/app/lib/comision";
import { ESTADO_INICIAL } from "@/app/lib/estado-formulario";
import { pesos } from "@/app/lib/formato";
import { type Coordenada, distanciaKm, redondear } from "@/app/lib/mapa";
import { cercaDeLaU, DISTANCIA_MINIMA_KM, esSentido, type Sentido } from "@/app/lib/sentido";
import { PRECIO_MAXIMO, PRECIO_MINIMO } from "@/app/lib/viaje";
import { Aviso, BotonEnviar, Campo } from "@/app/ui/auth/campos";
import { IconoCheck, IconoUbicacion } from "@/app/ui/comun/iconos-app";
import { Mapa } from "@/app/ui/comun/mapa";
import { PuntoEnLaU } from "@/app/ui/comun/punto-en-la-u";
import { SelectorSentido } from "@/app/ui/comun/selector-sentido";
import { useUbicacion } from "@/app/ui/comun/use-ubicacion";

// Publicar un cupo: a la U (ida) o de la U a la casa (regreso, 017). En la
// ida el conductor marca de dónde sale y el destino es la sede; en el regreso
// sale de la U (la sede o un punto cercano) y marca hasta dónde va. Luego la
// hora, cuántos puestos ofrece y el precio de cada uno.

interface Props {
  sede: { nombre: string; lat: number; lng: number };
  puestosMaximos: number;
}

export function FormularioCupo({ sede, puestosMaximos }: Props) {
  const [estado, accion] = useActionState(publicarCupo, ESTADO_INICIAL);
  const [sentido, setSentido] = useState<Sentido>(() => {
    const guardado = estado.valores?.sentido;
    return esSentido(guardado) ? guardado : "ida";
  });
  const [punto, setPunto] = useState<Coordenada | null>(null);
  const [puntoU, setPuntoU] = useState<Coordenada | null>(null);
  const [irA, setIrA] = useState<Coordenada | null>(null);
  const [precio, setPrecio] = useState(estado.valores?.precio ?? "");
  const ubicacion = useUbicacion((aqui) => {
    setIrA(aqui);
    setPunto(aqui);
  });
  const idHora = useId();
  const idPuestos = useId();
  const idPrecio = useId();
  const errores = estado.errores ?? {};
  const valores = estado.valores ?? {};

  const centroSede = { lat: sede.lat, lng: sede.lng };
  const regreso = sentido === "regreso";
  const enLaU = regreso && puntoU ? puntoU : centroSede;
  const muyCerca = punto !== null && distanciaKm(punto, enLaU) < DISTANCIA_MINIMA_KM;
  const uValido = !regreso || puntoU === null || cercaDeLaU(puntoU, centroSede);
  const guardado = punto ? redondear(punto) : null;
  const numero = Number(precio);
  const precioValido = precio !== "" && Number.isInteger(numero) && numero >= PRECIO_MINIMO && numero <= PRECIO_MAXIMO;

  return (
    <form action={accion} className="space-y-6" noValidate>
      {estado.resultado === "error" && estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}

      <SelectorSentido valor={sentido} alCambiar={setSentido} pregunta="¿Para dónde vas?" />
      {errores.sentido && <Aviso tipo="error">{errores.sentido}</Aviso>}

      <section aria-labelledby="titulo-salida" className="space-y-3">
        <div>
          <h2 id="titulo-salida" className="text-base">
            1. {regreso ? "¿Hasta dónde vas?" : "¿Desde dónde sales?"}
          </h2>
          <p className="text-sm text-texto-suave">
            {regreso
              ? `Sales de ${sede.nombre}. Mueve el mapa hasta que el pin quede en el final de tu recorrido; los estudiantes se bajan en el camino.`
              : `Mueve el mapa hasta que el pin quede en tu punto de salida. Vas hacia ${sede.nombre}.`}
          </p>
        </div>
        <Mapa
          etiqueta={regreso ? "Mapa para elegir hasta dónde vas" : "Mapa para elegir el punto de salida"}
          centro={centroSede}
          destino={centroSede}
          alElegir={setPunto}
          irA={irA}
          className="h-64"
        />
        <p role="status" className={`flex items-center gap-2 text-sm ${muyCerca ? "text-error" : "text-texto"}`}>
          {punto && !muyCerca && <IconoCheck className="size-5 shrink-0 text-secundario" />}
          {!punto
            ? regreso
              ? "Todavía no has elegido hasta dónde vas."
              : "Todavía no has elegido el punto de salida."
            : muyCerca
              ? "Ese punto es la universidad. Mueve el mapa más lejos."
              : regreso
                ? "Final del recorrido elegido."
                : "Punto de salida elegido."}
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
        <Campo
          etiqueta={regreso ? "Dirección o barrio hasta donde vas" : "Dirección o barrio de salida"}
          name="direccion"
          placeholder="Ej.: Barzal, Cra. 33 con Calle 15"
          defaultValue={valores.direccion}
          error={errores.direccion}
          maxLength={120}
        />
      </section>

      {regreso && (
        <PuntoEnLaU
          sede={sede}
          titulo="¿De dónde sales en la U?"
          ayuda="De la sede, o de otra portería o esquina cercana (máximo 500 m). Ahí se suben todos."
          punto={puntoU}
          alCambiar={setPuntoU}
          referencia={valores.referencia_u}
          errorReferencia={errores.referencia_u}
          errorPunto={errores.u_lat}
        />
      )}

      <section aria-labelledby="titulo-detalles" className="space-y-4">
        <h2 id="titulo-detalles" className="text-base">
          2. Hora, puestos y precio
        </h2>

        <div>
          <label htmlFor={idHora} className="mb-1.5 block text-sm font-medium">
            Fecha y hora de salida
          </label>
          <input
            id={idHora}
            name="sale_en"
            type="datetime-local"
            defaultValue={valores.sale_en}
            aria-invalid={errores.sale_en ? true : undefined}
            aria-describedby={`${idHora}-ayuda`}
            className="h-12 w-full rounded-xl border border-texto-suave/60 bg-superficie px-4 text-texto outline-none focus:border-secundario aria-[invalid=true]:border-error"
          />
          <p id={`${idHora}-ayuda`} className={`mt-1.5 text-sm ${errores.sale_en ? "text-error" : "text-texto-suave"}`}>
            {errores.sale_en ?? "Entre 15 minutos y 7 días desde ahora. Los estudiantes pagan hasta 10 minutos antes."}
          </p>
        </div>

        <div>
          <label htmlFor={idPuestos} className="mb-1.5 block text-sm font-medium">
            Puestos que ofreces
          </label>
          <select
            id={idPuestos}
            name="puestos"
            defaultValue={valores.puestos ?? "1"}
            aria-invalid={errores.puestos ? true : undefined}
            className="h-12 w-full rounded-xl border border-texto-suave/60 bg-superficie px-4 text-texto outline-none focus:border-secundario"
          >
            {Array.from({ length: puestosMaximos }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "puesto" : "puestos"}
              </option>
            ))}
          </select>
          {puestosMaximos === 1 && <p className="mt-1.5 text-sm text-texto-suave">En moto se ofrece un solo puesto.</p>}
          {errores.puestos && <p className="mt-1.5 text-sm text-error">{errores.puestos}</p>}
        </div>

        <div>
          <label htmlFor={idPrecio} className="mb-1.5 block text-sm font-medium">
            Precio por puesto
          </label>
          <input
            id={idPrecio}
            name="precio"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Ej.: 6000"
            value={precio}
            onChange={(e) => setPrecio(e.target.value.replace(/\D/g, "").slice(0, 6))}
            aria-invalid={errores.precio ? true : undefined}
            className="h-12 w-full rounded-xl border border-texto-suave/60 bg-superficie px-4 text-texto outline-none placeholder:text-texto-suave focus:border-secundario aria-[invalid=true]:border-error"
          />
          <p className={`mt-1.5 text-sm ${errores.precio ? "text-error" : "text-texto-suave"}`} aria-live="polite">
            {errores.precio ??
              (precioValido
                ? `Recibes ${pesos(gananciaConductor(numero))} por cada estudiante (después del ${PORCENTAJE_COMISION} % de UniGo).`
                : `Entre ${pesos(PRECIO_MINIMO)} y ${pesos(PRECIO_MAXIMO)}.`)}
          </p>
        </div>
      </section>

      <BotonEnviar enviando="Publicando…" deshabilitado={!punto || muyCerca || !uValido}>
        Publicar cupo
      </BotonEnviar>
      {!punto && (
        <p className="text-center text-sm text-texto-suave">
          {regreso ? "Primero elige en el mapa hasta dónde vas." : "Primero elige en el mapa desde dónde sales."}
        </p>
      )}
    </form>
  );
}
