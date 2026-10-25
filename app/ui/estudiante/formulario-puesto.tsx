"use client";

import { useActionState, useState } from "react";
import { pedirPuesto } from "@/app/lib/acciones-cupo";
import { distanciaATramoKm } from "@/app/lib/cupo";
import { ESTADO_INICIAL } from "@/app/lib/estado-formulario";
import { type Coordenada, distanciaTexto, redondear } from "@/app/lib/mapa";
import { Aviso, BotonEnviar, Campo } from "@/app/ui/auth/campos";
import { IconoCheck, IconoUbicacion } from "@/app/ui/comun/iconos-app";
import { Mapa } from "@/app/ui/comun/mapa";
import { useUbicacion } from "@/app/ui/comun/use-ubicacion";

// Pedir un puesto en un cupo: el estudiante elige en el mapa dónde subirse
// (ve la ruta del conductor) y la describe. El conductor aprueba o rechaza.

interface Props {
  cupoId: string;
  salida: Coordenada;
  destino: Coordenada;
}

export function FormularioPuesto({ cupoId, salida, destino }: Props) {
  const [estado, accion] = useActionState(pedirPuesto, ESTADO_INICIAL);
  const [punto, setPunto] = useState<Coordenada | null>(null);
  const [irA, setIrA] = useState<Coordenada | null>(null);
  const ubicacion = useUbicacion((aqui) => {
    setIrA(aqui);
    setPunto(aqui);
  });
  const errores = estado.errores ?? {};
  const valores = estado.valores ?? {};
  const guardado = punto ? redondear(punto) : null;
  const desvio = punto ? distanciaATramoKm(punto, salida, destino) : null;

  return (
    <form action={accion} className="space-y-5" noValidate>
      <input type="hidden" name="cupo" value={cupoId} />
      {estado.resultado === "error" && estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}

      <section aria-labelledby="titulo-recogida" className="space-y-3">
        <div>
          <h2 id="titulo-recogida" className="text-base">
            ¿Dónde te subes?
          </h2>
          <p className="text-sm text-texto-suave">Mueve el mapa hasta dejar el pin en un punto del camino del conductor.</p>
        </div>
        <Mapa
          etiqueta="Mapa para elegir dónde subirte"
          centro={salida}
          origen={salida}
          destino={destino}
          alElegir={setPunto}
          irA={irA}
          className="h-64"
        />
        <p role="status" className="flex items-center gap-2 text-sm text-texto">
          {punto && <IconoCheck className="size-5 shrink-0 text-secundario" />}
          {punto && desvio !== null
            ? `Punto elegido · a unos ${distanciaTexto(desvio)} del camino del conductor.`
            : "Todavía no has elegido dónde subirte."}
        </p>
        {ubicacion.estado.paso === "error" && <Aviso tipo="error">{ubicacion.estado.mensaje}</Aviso>}
        {errores.recogida_lat && <Aviso tipo="error">{errores.recogida_lat}</Aviso>}
        <button
          type="button"
          onClick={ubicacion.pedir}
          disabled={ubicacion.estado.paso === "buscando"}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-texto-suave/30 font-semibold text-texto transition-colors hover:bg-superficie disabled:opacity-70"
        >
          <IconoUbicacion className="size-5" />
          {ubicacion.estado.paso === "buscando" ? "Buscando tu ubicación…" : "Usar mi ubicación actual"}
        </button>
        <input type="hidden" name="recogida_lat" value={guardado?.lat ?? ""} />
        <input type="hidden" name="recogida_lng" value={guardado?.lng ?? ""} />
      </section>

      <Campo
        etiqueta="Dirección o barrio"
        name="direccion"
        placeholder="Ej.: Cra. 30 con Calle 10"
        defaultValue={valores.direccion}
        error={errores.direccion}
        maxLength={120}
      />
      <Campo
        etiqueta="Referencia (opcional)"
        name="referencia"
        placeholder="Ej.: paradero frente al colegio"
        defaultValue={valores.referencia}
        error={errores.referencia}
        maxLength={70}
      />

      <BotonEnviar enviando="Enviando solicitud…" deshabilitado={!punto}>
        Pedir puesto
      </BotonEnviar>
      <p className="text-center text-sm text-texto-suave">El conductor revisa tu solicitud y te aprueba o no.</p>
    </form>
  );
}
