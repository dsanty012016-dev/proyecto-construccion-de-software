"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource, Map as MapaLibre, Marker } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { type Coordenada, coordenadaValida, distanciaTexto, ESTILO_MAPA, limites } from "@/app/lib/mapa";
import { buscarRuta, CREDITO_RUTAS } from "@/app/lib/ruta-vial";

// Mapa de la app (MapLibre con el estilo oscuro de OpenFreeMap, teñido con la
// paleta de UniGo para que se vea como en los diseños). Dos usos:
// - Mostrar: recogida y destino con la ruta por las vías (FOSSGIS OSRM, ver
//   ruta-vial.ts); mientras llega, o si el servicio falla, una línea recta punteada.
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
  /** Puntos de recogida de otros estudiantes (cupos), como círculos pequeños. */
  paradas?: Coordenada[];
  /** Dónde va el conductor ahora (seguimiento en vivo); se mueve sin reencuadrar. */
  vehiculo?: Coordenada | null;
  /** De borde a borde (arriba de una pantalla): sin esquinas redondeadas ni botones de zoom. */
  aRas?: boolean;
  className?: string;
}

function elementoMarcador(tipo: "origen" | "destino" | "parada" | "vehiculo") {
  const elemento = document.createElement("div");
  elemento.setAttribute("aria-hidden", "true");
  // Como en los diseños: recogida = punto azul con halo; sede = la "U" blanca.
  const clases = {
    origen:
      "size-[18px] rounded-full border-[3px] border-texto bg-primario shadow-[0_0_0_10px_color-mix(in_srgb,var(--color-primario)_22%,transparent)]",
    destino: "flex size-6 items-center justify-center rounded-md bg-texto font-titulo text-sm font-bold text-fondo shadow-lg",
    parada: "size-3.5 rounded-full border-2 border-primario bg-texto shadow",
    vehiculo: "flex size-8 items-center justify-center rounded-full bg-texto text-fondo shadow-lg ring-4 ring-secundario/40",
  };
  elemento.className = clases[tipo];
  if (tipo === "destino") elemento.textContent = "U";
  if (tipo === "vehiculo") {
    // El mismo carro de los iconos de la app, dibujado aquí porque el marcador vive fuera de React.
    elemento.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14M6 17l1.5-6h9L18 17M8 11l1-3h6l1 3"/><circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="18" r="1.5"/></svg>';
  }
  return elemento;
}

/** Color de un token de globals.css (los colores no se escriben sueltos). */
function colorDeToken(nombre: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim() || "currentColor";
}

/**
 * Tiñe el estilo oscuro de OpenFreeMap con la paleta de UniGo (los diseños):
 * terreno azul noche, vías en dos tonos de azul, agua del color del fondo,
 * etiquetas en gris suave y sin puntos de interés que distraigan. Si una capa
 * no acepta un cambio, se deja como venía.
 */
function pintarEstilo(mapa: MapaLibre) {
  const c = {
    fondo: colorDeToken("--color-fondo"),
    tierra: colorDeToken("--color-mapa-tierra"),
    via: colorDeToken("--color-mapa-via"),
    viaMenor: colorDeToken("--color-mapa-via-menor"),
    textoSuave: colorDeToken("--color-texto-suave"),
  };
  const poner = (id: string, propiedad: string, valor: unknown) => {
    try {
      mapa.setPaintProperty(id, propiedad, valor);
    } catch {
      // Propiedad que esta capa no tiene.
    }
  };
  for (const capa of mapa.getStyle().layers ?? []) {
    const id = capa.id;
    const fuente = "source-layer" in capa ? capa["source-layer"] : undefined;
    if (capa.type === "background") {
      poner(id, "background-color", c.tierra);
    } else if (fuente === "poi" || fuente === "aerodrome_label" || fuente === "boundary" || fuente === "housenumber" || /oneway/.test(id)) {
      mapa.setLayoutProperty(id, "visibility", "none");
    } else if (capa.type === "symbol") {
      poner(id, "text-color", c.textoSuave);
      poner(id, "text-halo-color", c.fondo);
    } else if (fuente === "water" || fuente === "waterway") {
      poner(id, capa.type === "line" ? "line-color" : "fill-color", c.fondo);
    } else if (fuente === "building") {
      poner(id, "fill-color", c.viaMenor);
      poner(id, "fill-outline-color", c.viaMenor);
    } else if (fuente === "transportation") {
      const principal = /motorway|trunk|primary|major|secondary/.test(id);
      poner(id, "line-color", /casing/.test(id) ? c.tierra : principal ? c.via : c.viaMenor);
    } else if (capa.type === "fill") {
      // Sin texturas (el bosque usa una imagen que este estilo no trae).
      poner(id, "fill-pattern", undefined);
      poner(id, "fill-color", c.tierra);
      poner(id, "fill-outline-color", c.tierra);
    }
  }
}

/** Crea o actualiza una línea del mapa (vacía = sin coordenadas). */
function ponerLinea(mapa: MapaLibre, id: string, coordenadas: [number, number][], punteada: boolean) {
  const datos: GeoJSON.Feature<GeoJSON.LineString> = {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates: coordenadas },
  };
  const fuente = mapa.getSource(id) as GeoJSONSource | undefined;
  if (fuente) {
    fuente.setData(datos);
    return;
  }
  mapa.addSource(id, { type: "geojson", data: datos });
  mapa.addLayer({
    id,
    type: "line",
    source: id,
    layout: { "line-join": "round", "line-cap": punteada ? "butt" : "round" },
    paint: {
      "line-color": colorDeToken("--color-secundario"),
      "line-width": punteada ? 3 : 5,
      ...(punteada ? { "line-dasharray": [2, 1.5] } : {}),
    },
  });
}

/**
 * Encuadra la cámara marcando que el movimiento es de la app (no elige punto).
 * Por si el mapa ya estaba encuadrado y no hubo movimiento, la marca se suelta sola.
 */
function encuadrar(mapa: MapaLibre, caja: [[number, number], [number, number]], encuadrando: { current: boolean }, animar: boolean) {
  encuadrando.current = true;
  mapa.fitBounds(caja, { padding: 56, maxZoom: 15, animate: animar });
  setTimeout(() => {
    encuadrando.current = false;
  }, 1500);
}

export function Mapa({ etiqueta, centro, origen, destino, alElegir, irA, paradas, vehiculo, aRas, className }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<MapaLibre | null>(null);
  const libRef = useRef<Libreria | null>(null);
  const marcadores = useRef<{ origen?: Marker; destino?: Marker }>({});
  const marcadoresParadas = useRef<Marker[]>([]);
  const marcadorVehiculo = useRef<Marker | null>(null);
  // Cuando la app mueve la cámara para encuadrar la ruta, ese movimiento no
  // cuenta como "elegir punto": solo los de la persona (o "mi ubicación").
  const encuadrando = useRef(false);

  const centroInicial = useRef(centro);
  const alElegirRef = useRef(alElegir);
  const animar = useRef(true);
  const [estado, setEstado] = useState<Estado>("cargando");
  const [infoRuta, setInfoRuta] = useState<{ clave: string; km: number; minutos: number } | null>(null);
  const modoElegir = !!alElegir;
  const conControles = useRef(!aRas);

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
            attributionControl: { compact: true, customAttribution: CREDITO_RUTAS },
          });
        } catch {
          // Sin WebGL (navegador viejo o desactivado).
          setEstado("error");
          return;
        }
        const instancia = mapa;
        if (conControles.current) instancia.addControl(new lib.NavigationControl({ showCompass: false }), "top-right");
        // Si el estilo pide una imagen que no trae, se pone una transparente
        // en vez de llenar la consola de avisos.
        instancia.on("styleimagemissing", (evento) => {
          if (!instancia.hasImage(evento.id)) instancia.addImage(evento.id, { width: 1, height: 1, data: new Uint8Array(4) });
        });
        instancia.on("load", () => {
          cargado = true;
          pintarEstilo(instancia);
          libRef.current = lib;
          mapaRef.current = instancia;
          setEstado("listo");
        });
        // Si el estilo no carga (sin internet o el servicio caído), se avisa.
        instancia.on("error", () => {
          if (!cargado) setEstado("error");
        });
        instancia.on("moveend", () => {
          if (encuadrando.current) {
            encuadrando.current = false;
            return;
          }
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
      marcadoresParadas.current = [];
      marcadorVehiculo.current = null;
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

    if (!coordenadaValida(o) || !coordenadaValida(d)) return;

    // Primero la línea recta punteada; si llega la ruta por las vías, se cambia.
    ponerLinea(mapa, "ruta-vial", [], false);
    ponerLinea(mapa, "ruta-recta", [[o.lng, o.lat], [d.lng, d.lat]], true);
    const caja = limites([o, d]);
    if (caja) encuadrar(mapa, caja, encuadrando, animar.current);

    let vigente = true;
    const clave = `${o.lat},${o.lng},${d.lat},${d.lng}`;
    buscarRuta(o, d).then((ruta) => {
      if (!vigente || !ruta || mapaRef.current !== mapa) return;
      ponerLinea(mapa, "ruta-vial", ruta.coordenadas, false);
      ponerLinea(mapa, "ruta-recta", [], true);
      const puntos = ruta.coordenadas.map(([lng, lat]) => ({ lat, lng }));
      const cajaRuta = limites(puntos);
      if (cajaRuta) encuadrar(mapa, cajaRuta, encuadrando, animar.current);
      setInfoRuta({ clave, km: ruta.km, minutos: ruta.minutos });
    });
    return () => {
      vigente = false;
    };
  }, [estado, oLat, oLng, dLat, dLng]);

  // Paradas de los estudiantes (se comparan por contenido).
  const claveParadas = JSON.stringify(paradas ?? []);
  useEffect(() => {
    const mapa = mapaRef.current;
    const lib = libRef.current;
    if (estado !== "listo" || !mapa || !lib) return;
    for (const marcador of marcadoresParadas.current) marcador.remove();
    const lista: Coordenada[] = JSON.parse(claveParadas);
    marcadoresParadas.current = lista
      .filter(coordenadaValida)
      .map((p) => new lib.Marker({ element: elementoMarcador("parada") }).setLngLat([p.lng, p.lat]).addTo(mapa));
  }, [estado, claveParadas]);

  // El conductor en vivo: el marcador se crea una vez y luego solo se mueve.
  const vLat = vehiculo?.lat;
  const vLng = vehiculo?.lng;
  useEffect(() => {
    const mapa = mapaRef.current;
    const lib = libRef.current;
    if (estado !== "listo" || !mapa || !lib) return;
    const punto = vLat !== undefined && vLng !== undefined ? { lat: vLat, lng: vLng } : null;
    if (coordenadaValida(punto)) {
      if (marcadorVehiculo.current) marcadorVehiculo.current.setLngLat([punto.lng, punto.lat]);
      else marcadorVehiculo.current = new lib.Marker({ element: elementoMarcador("vehiculo") }).setLngLat([punto.lng, punto.lat]).addTo(mapa);
    } else if (marcadorVehiculo.current) {
      marcadorVehiculo.current.remove();
      marcadorVehiculo.current = null;
    }
  }, [estado, vLat, vLng]);

  // Mover la cámara cuando lo piden ("mi ubicación").
  const irLat = irA?.lat;
  const irLng = irA?.lng;
  useEffect(() => {
    const mapa = mapaRef.current;
    if (estado !== "listo" || !mapa || irLat === undefined || irLng === undefined) return;
    mapa.easeTo({ center: [irLng, irLat], zoom: Math.max(mapa.getZoom(), 16), duration: animar.current ? 600 : 0 });
  }, [estado, irLat, irLng]);

  return (
    <div role="region" aria-label={etiqueta} className={`relative overflow-hidden bg-superficie ${aRas ? "" : "rounded-2xl"} ${className ?? "h-64"}`}>
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

      {infoRuta && infoRuta.clave === `${oLat},${oLng},${dLat},${dLng}` && (
        <p className={`absolute left-2 rounded-lg ${aRas ? "bottom-8" : "bottom-2"} bg-fondo/90 px-2.5 py-1 text-xs font-semibold text-texto`}>
          {distanciaTexto(infoRuta.km)} · {infoRuta.minutos} min por vía
        </p>
      )}

      {estado !== "listo" && (
        <p role="status" className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-texto-suave">
          {estado === "cargando" ? "Cargando mapa…" : "No pudimos cargar el mapa. Revisa tu conexión."}
        </p>
      )}
    </div>
  );
}
