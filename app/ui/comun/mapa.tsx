"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource, Map as MapaLibre, Marker } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { type Coordenada, coordenadaValida, ESTILO_MAPA, limites } from "@/app/lib/mapa";

// Mapa de la app (MapLibre con el estilo oscuro de OpenFreeMap). Dos usos:
// - Mostrar: recogida y destino con una línea entre ellos, encuadrados.
// - Elegir (si se pasa alElegir): un pin fijo en el centro; la persona mueve el
//   mapa (dedo, mouse o flechas del teclado) o toca un sitio, y el centro es el
//   punto elegido. Así no depende del GPS.
// La librería se carga en el navegador, después de la página.

type Libreria = typeof import("maplibre-gl");
type Estado = "cargando" | "listo" | "error";

interface Props {
  /** Nombre del mapa para lectores de pantalla. */
  etiqueta: string;
  /** Dónde arranca la cámara. */
  centro: Coordenada;
  origen?: Coordenada | null;
  destino?: Coordenada | null;
  /** Modo elegir: se llama con el centro cada vez que el mapa deja de moverse. */
  alElegir?: (punto: Coordenada) => void;
  /** Mueve la cámara a este punto (por ejemplo, "mi ubicación"). */
  irA?: Coordenada | null;
  className?: string;
}

function elementoMarcador(tipo: "origen" | "destino") {
  const elemento = document.createElement("div");
  elemento.setAttribute("aria-hidden", "true");
  elemento.className =
    tipo === "origen"
      ? "size-5 rounded-full border-[3px] border-texto bg-primario shadow-lg"
      : "size-5 rounded-sm border-[3px] border-texto bg-secundario shadow-lg";
  return elemento;
}

/** Color de un token de globals.css (los colores no se escriben sueltos). */
function colorDeToken(nombre: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim() || "currentColor";
}

export function Mapa({ etiqueta, centro, origen, destino, alElegir, irA, className }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<MapaLibre | null>(null);
  const libRef = useRef<Libreria | null>(null);
  const marcadores = useRef<{ origen?: Marker; destino?: Marker }>({});
  const centroInicial = useRef(centro);
  const alElegirRef = useRef(alElegir);
  const animar = useRef(true);
  const [estado, setEstado] = useState<Estado>("cargando");
  const modoElegir = !!alElegir;

  // La función puede cambiar en cada render; el mapa siempre llama a la última.
  useEffect(() => {
    alElegirRef.current = alElegir;
  });

  // Crear el mapa una sola vez.
  useEffect(() => {
    let cancelado = false;
    let mapa: MapaLibre | null = null;
    animar.current = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    import("maplibre-gl")
      .then((lib) => {
        if (cancelado || !contenedor.current) return;
        const inicio = centroInicial.current;
        let cargado = false;
        try {
          mapa = new lib.Map({
            container: contenedor.current,
            style: ESTILO_MAPA,
            center: [inicio.lng, inicio.lat],
            zoom: 13,
            attributionControl: { compact: true },
          });
        } catch {
          // Sin WebGL (navegador viejo o desactivado).
          setEstado("error");
          return;
        }
        const instancia = mapa;
        instancia.addControl(new lib.NavigationControl({ showCompass: false }), "top-right");
        instancia.on("load", () => {
          cargado = true;
          libRef.current = lib;
          mapaRef.current = instancia;
          setEstado("listo");
        });
        // Si el estilo no carga (sin internet o el servicio caído), se avisa.
        instancia.on("error", () => {
          if (!cargado) setEstado("error");
        });
        instancia.on("moveend", () => {
          const c = instancia.getCenter();
          alElegirRef.current?.({ lat: c.lat, lng: c.lng });
        });
        instancia.on("click", (evento) => {
          if (alElegirRef.current) instancia.easeTo({ center: evento.lngLat, duration: animar.current ? 400 : 0 });
        });
      })
      .catch(() => {
        if (!cancelado) setEstado("error");
      });

    return () => {
      cancelado = true;
      mapa?.remove();
      mapaRef.current = null;
      marcadores.current = {};
    };
  }, []);

  // Marcadores y línea entre recogida y destino.
  const oLat = origen?.lat;
  const oLng = origen?.lng;
  const dLat = destino?.lat;
  const dLng = destino?.lng;
  useEffect(() => {
    const mapa = mapaRef.current;
    const lib = libRef.current;
    if (estado !== "listo" || !mapa || !lib) return;
    const o = oLat !== undefined && oLng !== undefined ? { lat: oLat, lng: oLng } : null;
    const d = dLat !== undefined && dLng !== undefined ? { lat: dLat, lng: dLng } : null;

    for (const [tipo, punto] of [
      ["origen", o],
      ["destino", d],
    ] as const) {
      const actual = marcadores.current[tipo];
      if (coordenadaValida(punto)) {
        if (actual) actual.setLngLat([punto.lng, punto.lat]);
        else marcadores.current[tipo] = new lib.Marker({ element: elementoMarcador(tipo) }).setLngLat([punto.lng, punto.lat]).addTo(mapa);
      } else if (actual) {
        actual.remove();
        delete marcadores.current[tipo];
      }
    }

    if (coordenadaValida(o) && coordenadaValida(d)) {
      const linea: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [[o.lng, o.lat], [d.lng, d.lat]] },
      };
      const fuente = mapa.getSource("ruta") as GeoJSONSource | undefined;
      if (fuente) fuente.setData(linea);
      else {
        mapa.addSource("ruta", { type: "geojson", data: linea });
        mapa.addLayer({
          id: "ruta",
          type: "line",
          source: "ruta",
          paint: { "line-color": colorDeToken("--color-secundario"), "line-width": 4, "line-dasharray": [2, 1.5] },
        });
      }
      const caja = limites([o, d]);
      if (caja) mapa.fitBounds(caja, { padding: 56, maxZoom: 15, animate: animar.current });
    }
  }, [estado, oLat, oLng, dLat, dLng]);

  // Mover la cámara cuando lo piden ("mi ubicación").
  const irLat = irA?.lat;
  const irLng = irA?.lng;
  useEffect(() => {
    const mapa = mapaRef.current;
    if (estado !== "listo" || !mapa || irLat === undefined || irLng === undefined) return;
    mapa.easeTo({ center: [irLng, irLat], zoom: Math.max(mapa.getZoom(), 16), duration: animar.current ? 600 : 0 });
  }, [estado, irLat, irLng]);

  return (
    <div role="region" aria-label={etiqueta} className={`relative overflow-hidden rounded-2xl bg-superficie ${className ?? "h-64"}`}>
      {/* Alto y ancho explícitos: la hoja de MapLibre le pone position: relative
          al contenedor y le gana a "absolute inset-0", que lo dejaba en 0 px. */}
      <div ref={contenedor} className="h-full w-full" />

      {modoElegir && estado === "listo" && (
        // Pin fijo: la punta queda justo en el centro del mapa.
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-full text-primario drop-shadow-lg"
        >
          <path
            d="M12 23s8-6.4 8-12.5a8 8 0 10-16 0C4 16.6 12 23 12 23z"
            fill="currentColor"
            className="stroke-texto"
            strokeWidth={1.5}
          />
          <circle cx="12" cy="10.5" r="3" className="fill-texto" />
        </svg>
      )}

      {estado !== "listo" && (
        <p role="status" className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-texto-suave">
          {estado === "cargando" ? "Cargando mapa…" : "No pudimos cargar el mapa. Revisa tu conexión."}
        </p>
      )}
    </div>
  );
}
