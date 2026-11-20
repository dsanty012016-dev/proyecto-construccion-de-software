"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import "./mapa-visor.css";
import type { GeoJSONSource, Map as MapaLibre, Marker } from "maplibre-gl";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { type Coordenada, coordenadaValida, distanciaTexto, ESTILO_MAPA, limites } from "@/app/lib/mapa";
import { buscarRuta, CREDITO_RUTAS } from "@/app/lib/ruta-vial";
import { IconoAmpliarMapa, IconoReducirMapa } from "./iconos-app";
import { escucharTema } from "./tema-navegador";

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
  /** Si se dan, cada parada muestra su número de orden de recogida (1, 2, 3...). */
  numerarParadas?: boolean;
  /** Dónde va el conductor ahora (seguimiento en vivo); se mueve sin reencuadrar. */
  vehiculo?: Coordenada | null;
  /** De borde a borde (arriba de una pantalla): sin esquinas redondeadas ni botones de zoom. */
  aRas?: boolean;
  /** Regreso (017): la "U" va en el origen y el punto azul (la casa) en el destino. */
  uEnElOrigen?: boolean;
  /** Estado del seguimiento visible en los dos tamaños. */
  avisoSeguimiento?: ReactNode;
  className?: string;
}

/** Cuánto se ven los créditos del mapa antes de plegarse en el botón "i". */
const SEGUNDOS_CREDITOS = 4;

function elementoMarcador(tipo: "origen" | "destino" | "parada" | "paradaNumerada" | "vehiculo", texto?: string) {
  const elemento = document.createElement("div");
  elemento.setAttribute("aria-hidden", "true");
  // Como en los diseños: recogida = punto azul con halo; sede = la "U" blanca.
  const clases = {
    origen:
      "size-[18px] rounded-full border-[3px] border-texto bg-primario shadow-[0_0_0_10px_color-mix(in_srgb,var(--color-primario)_22%,transparent)]",
    destino: "flex size-6 items-center justify-center rounded-md bg-texto font-titulo text-sm font-bold text-fondo shadow-lg",
    parada: "size-3.5 rounded-full border-2 border-primario bg-texto shadow",
    paradaNumerada: "flex size-6 items-center justify-center rounded-full border-2 border-primario bg-texto font-titulo text-xs font-bold text-fondo shadow",
    vehiculo: "flex size-8 items-center justify-center rounded-full bg-texto text-fondo shadow-lg ring-4 ring-secundario/40",
  };
  elemento.className = clases[tipo];
  if (tipo === "destino") elemento.textContent = "U";
  if (tipo === "paradaNumerada" && texto) elemento.textContent = texto;
  if (tipo === "vehiculo") {
    // El mismo carro de los iconos de la app, dibujado aquí porque el marcador vive fuera de React.
    elemento.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14M6 17l1.5-6h9L18 17M8 11l1-3h6l1 3"/><circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="18" r="1.5"/></svg>';
  }
  return elemento;
}

/** Color de un token de globals.css (los colores no se escriben sueltos). */
function colorDeToken(mapa: MapaLibre, nombre: string) {
  return getComputedStyle(mapa.getContainer()).getPropertyValue(nombre).trim() || "currentColor";
}

/**
 * Tiñe el estilo oscuro de OpenFreeMap con la paleta de UniGo (los diseños):
 * terreno azul noche, vías en dos tonos de azul, agua del color del fondo,
 * etiquetas en gris suave y sin puntos de interés que distraigan. Si una capa
 * no acepta un cambio, se deja como venía.
 */
function pintarEstilo(mapa: MapaLibre) {
  const c = {
    fondo: colorDeToken(mapa, "--color-fondo"),
    tierra: colorDeToken(mapa, "--color-mapa-tierra"),
    via: colorDeToken(mapa, "--color-mapa-via"),
    viaMenor: colorDeToken(mapa, "--color-mapa-via-menor"),
    textoSuave: colorDeToken(mapa, "--color-texto-suave"),
  };
  // MapLibre 6 tipa cada propiedad de pintura; aquí se arman por nombre.
  type Propiedad = Parameters<MapaLibre["setPaintProperty"]>[1];
  type Valor = Parameters<MapaLibre["setPaintProperty"]>[2];
  const poner = (id: string, propiedad: string, valor: string | undefined) => {
    try {
      mapa.setPaintProperty(id, propiedad as Propiedad, valor as Valor);
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
      "line-color": colorDeToken(mapa, "--color-secundario"),
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

export function Mapa({ etiqueta, centro, origen, destino, alElegir, irA, paradas, numerarParadas, vehiculo, aRas, uEnElOrigen, avisoSeguimiento, className }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const visor = useRef<HTMLDialogElement>(null);
  const botonAmpliar = useRef<HTMLButtonElement>(null);
  const botonReducir = useRef<HTMLButtonElement>(null);
  const tituloVisor = useId();
  const [ampliado, setAmpliado] = useState(false);
  const mapaRef = useRef<MapaLibre | null>(null);
  const libRef = useRef<Libreria | null>(null);
  const marcadores = useRef<{ origen?: { marcador: Marker; estilo: "origen" | "destino" }; destino?: { marcador: Marker; estilo: "origen" | "destino" } }>({});
  const marcadoresParadas = useRef<Marker[]>([]);
  const marcadorVehiculo = useRef<Marker | null>(null);
  // Cuando la app mueve la cámara para encuadrar la ruta, ese movimiento no
  // cuenta como "elegir punto": solo los de la persona (o "mi ubicación").
  const encuadrando = useRef(false);

  const centroInicial = useRef(centro);
  const alElegirRef = useRef(alElegir);
  const animar = useRef(true);
  const [estado, setEstado] = useState<Estado>("cargando");
  const [intento, setIntento] = useState(0);
  const [infoRuta, setInfoRuta] = useState<{ clave: string; km: number; minutos: number } | null>(null);
  const modoElegir = !!alElegir;
  const conControles = useRef(!aRas);

  // La función puede cambiar en cada render; el mapa siempre llama a la última.
  useEffect(() => {
    alElegirRef.current = alElegir;
  });

  // Reintentar recrea solo el mapa: los campos y el punto viven en el formulario.
  useEffect(() => {
    let cancelado = false;
    let cargado = false;
    let mapa: MapaLibre | null = null;
    const host = contenedor.current;
    let plegar: ReturnType<typeof setTimeout> | undefined;
    const limiteCarga = setTimeout(() => {
      if (!cancelado && !cargado) setEstado("error");
    }, 20_000);
    animar.current = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    import("maplibre-gl")
      .then((lib) => {
        if (cancelado || !contenedor.current) return;
        // MapLibre 6 dibuja en un worker aparte: Next.js lo publica como archivo
        // propio y aquí se le dice dónde está (forma que documenta MapLibre).
        lib.setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());
        const inicio = centroInicial.current;
        try {
          mapa = new lib.Map({
            container: contenedor.current,
            style: ESTILO_MAPA,
            center: [inicio.lng, inicio.lat],
            zoom: 13,
            attributionControl: { compact: true, customAttribution: CREDITO_RUTAS },
          });
        } catch {
          clearTimeout(limiteCarga);
          // Sin WebGL2 (navegador viejo o desactivado).
          setEstado("error");
          return;
        }
        const instancia = mapa;
        if (conControles.current) instancia.addControl(new lib.NavigationControl({ showCompass: false }), "top-right");
        // Si el estilo pide una imagen que no trae, se pone una transparente
        // en vez de llenar la consola de avisos.
        instancia.setMissingStyleImageResolver((id) => {
          if (!instancia.hasImage(id)) instancia.addImage(id, { width: 1, height: 1, data: new Uint8Array(4) });
        });
        instancia.on("load", () => {
          if (cancelado) return;
          cargado = true;
          clearTimeout(limiteCarga);
          pintarEstilo(instancia);
          libRef.current = lib;
          mapaRef.current = instancia;
          setEstado("listo");
          requestAnimationFrame(() => { if (!cancelado) instancia.resize(); });
          // Los créditos (licencia de OpenStreetMap) se ven al abrir el mapa
          // y a los pocos segundos se pliegan en el botón "i"; con tocarlo
          // vuelven a salir. MapLibre ya los pliega al arrastrar el mapa.
          plegar = setTimeout(() => {
            const creditos = instancia.getContainer().querySelector(".maplibregl-ctrl-attrib.maplibregl-compact-show");
            creditos?.classList.remove("maplibregl-compact-show");
            creditos?.removeAttribute("open");
          }, SEGUNDOS_CREDITOS * 1000);
        });
        // Si el estilo no carga (sin internet o el servicio caído), se avisa.
        instancia.on("error", () => {
          if (!cancelado && !cargado) { clearTimeout(limiteCarga); setEstado("error"); }
        });
        instancia.on("moveend", (evento) => {
          if (cancelado || !cargado) return;
          if (encuadrando.current) {
            encuadrando.current = false;
            return;
          }
          // Cargar o redimensionar el mapa no equivale a elegir un punto.
          if (!evento.originalEvent && !("puntoElegido" in evento && evento.puntoElegido === true)) return;
          const c = instancia.getCenter();
          centroInicial.current = { lat: c.lat, lng: c.lng };
          alElegirRef.current?.({ lat: c.lat, lng: c.lng });
        });
        instancia.on("click", (evento) => {
          if (!cancelado && cargado && alElegirRef.current) instancia.easeTo({ center: evento.lngLat, duration: animar.current ? 400 : 0 }, { puntoElegido: true });
        });
      })
      .catch(() => {
        clearTimeout(limiteCarga);
        if (!cancelado) setEstado("error");
      });

    return () => {
      cancelado = true;
      clearTimeout(plegar);
      clearTimeout(limiteCarga);
      mapa?.remove();
      host?.replaceChildren();
      mapaRef.current = null;
      marcadores.current = {};
      marcadoresParadas.current = [];
      marcadorVehiculo.current = null;
    };
  }, [intento]);

  // Marcadores y línea entre recogida y destino.
  const oLat = origen?.lat;
  const oLng = origen?.lng;
  const dLat = destino?.lat;
  const dLng = destino?.lng;
  const claveParadas = JSON.stringify(paradas ?? []);
  const claveParadasDeRuta = numerarParadas ? claveParadas : "[]";
  const claveRuta = `${oLat},${oLng},${dLat},${dLng}:${claveParadasDeRuta}`;
  // Al cambiar entre modo claro y oscuro, el mapa se vuelve a teñir con la
  // paleta del modo nuevo (los colores salen de globals.css).
  useEffect(() => {
    if (estado !== "listo") return;
    return escucharTema(() => {
      const mapa = mapaRef.current;
      if (!mapa) return;
      pintarEstilo(mapa);
      for (const id of ["ruta-vial", "ruta-recta"]) {
        if (mapa.getLayer(id)) mapa.setPaintProperty(id, "line-color", colorDeToken(mapa, "--color-secundario"));
      }
    });
  }, [estado]);

  useEffect(() => {
    const mapa = mapaRef.current;
    const lib = libRef.current;
    if (estado !== "listo" || !mapa || !lib) return;
    const o = oLat !== undefined && oLng !== undefined ? { lat: oLat, lng: oLng } : null;
    const d = dLat !== undefined && dLng !== undefined ? { lat: dLat, lng: dLng } : null;

    // Estilo de cada punta: la "U" va donde está la universidad.
    const estilos = uEnElOrigen ? ({ origen: "destino", destino: "origen" } as const) : ({ origen: "origen", destino: "destino" } as const);
    for (const [tipo, punto] of [
      ["origen", o],
      ["destino", d],
    ] as const) {
      const actual = marcadores.current[tipo];
      const estilo = estilos[tipo];
      if (actual && (!coordenadaValida(punto) || actual.estilo !== estilo)) {
        actual.marcador.remove();
        delete marcadores.current[tipo];
      }
      if (!coordenadaValida(punto)) continue;
      const vigenteMarcador = marcadores.current[tipo];
      if (vigenteMarcador) vigenteMarcador.marcador.setLngLat([punto.lng, punto.lat]);
      else
        marcadores.current[tipo] = {
          marcador: new lib.Marker({ element: elementoMarcador(estilo) }).setLngLat([punto.lng, punto.lat]).addTo(mapa),
          estilo,
        };
    }

    if (!coordenadaValida(o) || !coordenadaValida(d)) return;

    const intermedios = (JSON.parse(claveParadasDeRuta) as Coordenada[]).filter(coordenadaValida);
    const recorrido = [o, ...intermedios, d];
    // La línea provisional conserva el orden de las paradas.
    ponerLinea(mapa, "ruta-vial", [], false);
    ponerLinea(mapa, "ruta-recta", recorrido.map(({ lng, lat }) => [lng, lat]), true);
    const caja = limites(recorrido);
    if (caja) encuadrar(mapa, caja, encuadrando, animar.current);

    let vigente = true;
    buscarRuta(o, d, intermedios).then((ruta) => {
      if (!vigente || !ruta || mapaRef.current !== mapa) return;
      ponerLinea(mapa, "ruta-vial", ruta.coordenadas, false);
      ponerLinea(mapa, "ruta-recta", [], true);
      const puntos = ruta.coordenadas.map(([lng, lat]) => ({ lat, lng }));
      const cajaRuta = limites([...recorrido, ...puntos]);
      if (cajaRuta) encuadrar(mapa, cajaRuta, encuadrando, animar.current);
      setInfoRuta({ clave: claveRuta, km: ruta.km, minutos: ruta.minutos });
    });
    return () => {
      vigente = false;
    };
  }, [estado, oLat, oLng, dLat, dLng, uEnElOrigen, claveParadasDeRuta, claveRuta]);

  // Paradas de los estudiantes (se comparan por contenido).
  useEffect(() => {
    const mapa = mapaRef.current;
    const lib = libRef.current;
    if (estado !== "listo" || !mapa || !lib) return;
    for (const marcador of marcadoresParadas.current) marcador.remove();
    const lista: Coordenada[] = JSON.parse(claveParadas);
    marcadoresParadas.current = lista
      .filter(coordenadaValida)
      .map((p, i) =>
        new lib.Marker({ element: numerarParadas ? elementoMarcador("paradaNumerada", String(i + 1)) : elementoMarcador("parada") })
          .setLngLat([p.lng, p.lat])
          .addTo(mapa),
      );
  }, [estado, claveParadas, numerarParadas]);

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
    mapa.easeTo({ center: [irLng, irLat], zoom: Math.max(mapa.getZoom(), 16), duration: animar.current ? 600 : 0 }, { puntoElegido: true });
  }, [estado, irLat, irLng]);

  function ampliar() {
    if (!visor.current || visor.current.open) return;
    visor.current.showModal();
    setAmpliado(true);
    botonReducir.current?.focus({ preventScroll: true });
  }

  function alCerrarVisor() {
    // Al volver, el navegador mantiene el mismo lienzo y MapLibre ajusta su tamaño.
    if (visor.current?.open) return;
    setAmpliado(false);
    botonAmpliar.current?.focus({ preventScroll: true });
  }

  return (
    <div style={estado === "error" ? { height: "auto" } : undefined} className={className ?? "h-64"}>
      <dialog ref={visor} className="mapa-visor" role={ampliado ? undefined : "presentation"}
        aria-labelledby={ampliado ? tituloVisor : undefined} onClose={alCerrarVisor}>
        <header className="mapa-visor-barra">
          <p id={tituloVisor} className="min-w-0 font-semibold [overflow-wrap:anywhere]">{etiqueta}</p>
          <button ref={botonReducir} type="button" onClick={() => visor.current?.close()} aria-label="Salir de pantalla completa"
            className="mapa-visor-boton shrink-0">
            <IconoReducirMapa className="size-5" />
          </button>
        </header>
        <div role="region" aria-label={etiqueta} className={`mapa-visor-contenido relative min-w-0 overflow-hidden bg-superficie ${aRas || ampliado ? "" : "rounded-2xl"}`}>
          {/* Alto y ancho explícitos: la hoja de MapLibre le pone position: relative
              al contenedor y le gana a "absolute inset-0", que lo dejaba en 0 px. */}
          <div ref={contenedor} inert={estado !== "listo"} aria-hidden={estado !== "listo"} className={estado === "error" ? "hidden" : "h-full w-full"} />

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

          {estado === "listo" && infoRuta?.clave === claveRuta && (
            <p className={`absolute left-2 rounded-lg ${aRas ? "bottom-8" : "bottom-2"} bg-fondo/90 px-2.5 py-1 text-xs font-semibold text-texto`}>
              {distanciaTexto(infoRuta.km)} · {infoRuta.minutos} min por vía
            </p>
          )}

          {avisoSeguimiento}

          {estado === "listo" && (
            <button ref={botonAmpliar} type="button" onClick={ampliar} aria-label="Ampliar mapa" aria-haspopup="dialog"
              className="mapa-visor-boton mapa-visor-ampliar">
              <IconoAmpliarMapa className="size-5" />
            </button>
          )}

          {estado !== "listo" && (
            <div className={`${estado === "error" ? "relative min-h-52" : "absolute inset-0"} z-10 overflow-auto bg-superficie p-4 text-center text-sm text-texto-suave`}>
              <div className={`flex ${estado === "error" ? "min-h-44" : "min-h-full"} flex-col items-center justify-center gap-3`}>
                <p role="status">{estado === "cargando" ? "Cargando mapa…" : "No pudimos cargar el mapa. Revisa tu conexión y reintenta; los datos que escribiste se conservan."}</p>
                {estado === "error" && <button type="button" onClick={() => {
                  setEstado("cargando");
                  setInfoRuta(null);
                  setIntento((valor) => valor + 1);
                }} className="min-h-11 max-w-full shrink-0 rounded-xl border border-texto-suave/40 px-4 py-2 font-semibold text-texto hover:bg-fondo">Reintentar mapa</button>}
              </div>
            </div>
          )}
        </div>
      </dialog>
    </div>
  );
}
