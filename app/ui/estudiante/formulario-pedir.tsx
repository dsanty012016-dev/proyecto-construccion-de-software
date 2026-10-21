"use client";

import { useActionState, useState } from "react";
import { pedirViaje } from "@/app/lib/acciones-viaje";
import { ESTADO_INICIAL } from "@/app/lib/estado-formulario";
import { Aviso, BotonEnviar, Campo } from "@/app/ui/auth/campos";
import { IconoCheck, IconoUbicacion } from "@/app/ui/comun/iconos-app";
import { RutaViaje } from "@/app/ui/comun/ruta-viaje";

// Formulario para pedir un viaje. Mientras no hay mapa (fase 4), el punto de
// recogida sale de la ubicación del celular y la persona lo describe con
// palabras (dirección o barrio, y una referencia opcional).

interface Ubicacion {
  lat: number;
  lng: number;
  precision: number;
}

type EstadoUbicacion = { paso: "pendiente" } | { paso: "buscando" } | { paso: "lista"; ubicacion: Ubicacion } | { paso: "error"; mensaje: string };

/** Códigos de GeolocationPositionError: 1 permiso, 2 sin señal, 3 tardó demasiado. */
function mensajeDeFallo(codigo: number): string {
  if (codigo === 1) return "El navegador no nos dejó leer tu ubicación. Permítela en el candado de la barra de direcciones y vuelve a intentar.";
  if (codigo === 2) return "Tu dispositivo no pudo calcular dónde estás. Revisa que la ubicación del sistema esté activada.";
  if (codigo === 3) return "La ubicación tardó demasiado. Inténtalo de nuevo.";
  return "No pudimos leer tu ubicación. Inténtalo de nuevo.";
}

export function FormularioPedir({ destino }: { destino: string }) {
  const [estado, accion] = useActionState(pedirViaje, ESTADO_INICIAL);
  const [ubicacion, setUbicacion] = useState<EstadoUbicacion>({ paso: "pendiente" });
  const errores = estado.errores ?? {};
  const valores = estado.valores ?? {};

  function pedirUbicacion() {
    if (!("geolocation" in navigator)) {
      setUbicacion({ paso: "error", mensaje: "Este navegador no puede darnos tu ubicación." });
      return;
    }
    setUbicacion({ paso: "buscando" });
    navigator.geolocation.getCurrentPosition(
      (posicion) =>
        setUbicacion({
          paso: "lista",
          ubicacion: { lat: posicion.coords.latitude, lng: posicion.coords.longitude, precision: Math.round(posicion.coords.accuracy) },
        }),
      (fallo) =>
        setUbicacion({ paso: "error", mensaje: mensajeDeFallo(fallo.code) }),
      // Sin "alta precisión": en computadores sin GPS responde mucho más rápido
      // (usa la red) y alcanza de sobra, porque la persona también escribe la dirección.
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    );
  }

  const lista = ubicacion.paso === "lista" ? ubicacion.ubicacion : null;

  return (
    <form action={accion} className="space-y-5" noValidate>
      {estado.resultado === "error" && estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}

      <section aria-labelledby="titulo-ubicacion" className="space-y-3 rounded-2xl bg-superficie p-4">
        <h2 id="titulo-ubicacion" className="text-base">
          1. Tu ubicación
        </h2>
        {lista ? (
          <p className="flex items-center gap-2 text-sm text-texto" role="status">
            <IconoCheck className="size-5 text-secundario" />
            Ubicación lista (precisión de unos {lista.precision} m).
          </p>
        ) : (
          <p className="text-sm text-texto-suave">Para que el conductor te encuentre necesitamos saber dónde estás.</p>
        )}
        {ubicacion.paso === "error" && <Aviso tipo="error">{ubicacion.mensaje}</Aviso>}
        {errores.origen_lat && <Aviso tipo="error">{errores.origen_lat}</Aviso>}
        <button
          type="button"
          onClick={pedirUbicacion}
          disabled={ubicacion.paso === "buscando"}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-texto-suave/30 font-semibold text-texto transition-colors hover:bg-fondo disabled:opacity-70"
        >
          <IconoUbicacion className="size-5" />
          {ubicacion.paso === "buscando" ? "Buscando tu ubicación…" : lista ? "Actualizar mi ubicación" : "Usar mi ubicación actual"}
        </button>
        <input type="hidden" name="origen_lat" value={lista?.lat ?? ""} />
        <input type="hidden" name="origen_lng" value={lista?.lng ?? ""} />
      </section>

      <section aria-labelledby="titulo-recogida" className="space-y-4">
        <h2 id="titulo-recogida" className="text-base">
          2. ¿Dónde te recogemos?
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

      <section aria-labelledby="titulo-destino" className="space-y-3 rounded-2xl bg-superficie p-4">
        <h2 id="titulo-destino" className="text-base">
          Tu viaje
        </h2>
        <RutaViaje origen="Tu ubicación actual" destino={destino} />
        <p className="text-sm text-texto-suave">Los conductores te enviarán su precio. Tú eliges la oferta que más te sirva.</p>
      </section>

      <BotonEnviar enviando="Buscando conductores…" deshabilitado={!lista}>
        Buscar conductores
      </BotonEnviar>
      {!lista && <p className="text-center text-sm text-texto-suave">Primero toca “Usar mi ubicación actual”.</p>}
    </form>
  );
}
