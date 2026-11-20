"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource, Map as MapaLibre, Marker } from "maplibre-gl";
import { useEffect, useRef } from "react";
import { ESTILO_MAPA } from "@/app/lib/mapa";
import { CREDITO_RUTAS } from "@/app/lib/ruta-vial";
import { colorDeToken, pintarEstilo } from "@/app/ui/comun/mapa";
import { escucharTema } from "@/app/ui/comun/tema-navegador";
import { BARRIO_INICIAL, BARRIOS, barrioPorNombre, cajaDe, EVENTO_BARRIO, rutaHasta, SALIDAS_EJEMPLO, SEDE } from "./plano-datos";

// El plano de la portada: el mapa real de Villavicencio (OpenStreetMap por
// OpenFreeMap, teñido con los tokens de UniGo) queda quieto detrás de toda la
// página y el texto pasa por encima. Cada sección dice qué mirar con atributos:
//   data-foco="ruta|u|cupos|todo"  qué encuadra la cámara
//   data-lado="izquierda|derecha|ancho|abajo"  dónde está el texto, para no taparlo
//   data-capa="ofertas|cupos"  marcas de ejemplo que se encienden en esa sección
//   data-ruta="Barzal"  ruta fija para esa sección (si no, la del barrio elegido)
// Es decoración: el mapa no recibe clics ni gestos, así el scroll es de la página.

type Foco = "ruta" | "u" | "cupos" | "todo";
type Caja = [[number, number], [number, number]];
type Margen = { top: number; bottom: number; left: number; right: number };

const RUTAS_CUPOS = SALIDAS_EJEMPLO.map((s) => barrioPorNombre(s.barrio).ruta);

function caja(foco: Foco, ruta: [number, number][]): Caja {
  if (foco === "u") return [[SEDE.lng - 0.006, SEDE.lat - 0.004], [SEDE.lng + 0.006, SEDE.lat + 0.004]];
  if (foco === "cupos") return cajaDe(RUTAS_CUPOS.flat());
  if (foco === "todo") return cajaDe(BARRIOS.flatMap((b) => b.ruta));
  return cajaDe(ruta);
}

/** Margen de la cámara para que lo que se encuadra no quede debajo del texto. */
function margen(lado: string | undefined): Margen {
  const ancho = window.innerWidth;
  const alto = window.innerHeight;
  if (ancho < 768) return { top: 84, bottom: Math.round(alto * 0.56), left: 28, right: 28 };
  const lejos = Math.round(ancho * 0.46);
  const cerca = Math.round(ancho * 0.06);
  if (lado === "derecha") return { top: 110, bottom: 90, left: cerca, right: lejos };
  if (lado === "ancho") return { top: 110, bottom: 90, left: Math.round(ancho * 0.6), right: cerca };
  if (lado === "abajo") return { top: 100, bottom: Math.round(alto * 0.5), left: cerca * 2, right: cerca * 2 };
  return { top: 110, bottom: 90, left: lejos, right: cerca };
}

function lineaVacia(): GeoJSON.Feature<GeoJSON.LineString> {
  return { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } };
}

function elemento(clase: string, html: string) {
  const nodo = document.createElement("div");
  nodo.className = clase;
  nodo.setAttribute("aria-hidden", "true");
  nodo.innerHTML = html;
  return nodo;
}

export function PlanoPortada() {
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = contenedor.current;
    if (!host) return;
    // Las funciones de abajo se declaran antes del chequeo; esta constante ya no es null.
    const raiz: HTMLDivElement = host;
    let cancelado = false;
    let mapa: MapaLibre | null = null;
    let listo = false;
    let quitarTema: (() => void) | undefined;
    let cuadro = 0;
    let espera: ReturnType<typeof setTimeout> | undefined;
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)");

    let elegido = BARRIO_INICIAL;
    let mostrada = "";
    let activa: HTMLElement | null = null;
    let origen: Marker | null = null;
    const ofertas: Marker[] = [];

    const rutaVisible = () => activa?.dataset.ruta ?? elegido;

    function encuadrar(animar: boolean) {
      if (!mapa || !listo) return;
      const foco = (activa?.dataset.foco ?? "ruta") as Foco;
      mapa.fitBounds(caja(foco, barrioPorNombre(rutaVisible()).ruta), {
        padding: margen(activa?.dataset.lado),
        maxZoom: 15.5,
        duration: animar && !quieto.matches ? 1600 : 0,
      });
    }

    function dibujarRuta(nombre: string, animar: boolean) {
      if (!mapa || !listo) return;
      const barrio = barrioPorNombre(nombre);
      mostrada = barrio.nombre;
      const lngLat: [number, number] = [barrio.punto.lng, barrio.punto.lat];
      origen?.setLngLat(lngLat);
      for (const marca of ofertas) marca.setLngLat(lngLat);
      const fuente = mapa.getSource("ruta") as GeoJSONSource | undefined;
      cancelAnimationFrame(cuadro);
      const poner = (coordenadas: [number, number][]) =>
        fuente?.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coordenadas } });
      if (!animar || quieto.matches) {
        poner(barrio.ruta);
        return;
      }
      // El único movimiento propio de la portada: la ruta se dibuja por las vías.
      const inicio = performance.now();
      const paso = (ahora: number) => {
        const t = Math.min(1, (ahora - inicio) / 1100);
        const suave = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
        poner(rutaHasta(barrio.ruta, suave));
        if (t < 1) cuadro = requestAnimationFrame(paso);
      };
      cuadro = requestAnimationFrame(paso);
    }

    function activar(seccion: HTMLElement) {
      activa = seccion;
      raiz.dataset.capa = seccion.dataset.capa ?? "";
      if (mapa && listo) {
        mapa.setPaintProperty("cupos", "line-opacity", seccion.dataset.capa === "cupos" ? 0.9 : 0);
        if (rutaVisible() !== mostrada) dibujarRuta(rutaVisible(), true);
      }
      encuadrar(true);
    }

    function pintarLineas() {
      if (!mapa) return;
      mapa.setPaintProperty("ruta-borde", "line-color", colorDeToken("--color-fondo"));
      mapa.setPaintProperty("ruta", "line-color", colorDeToken("--color-primario"));
      mapa.setPaintProperty("cupos", "line-color", colorDeToken("--color-texto"));
    }

    const alElegir = (evento: Event) => {
      const nombre = (evento as CustomEvent<string>).detail;
      if (typeof nombre !== "string") return;
      elegido = nombre;
      if (!activa?.dataset.ruta) {
        dibujarRuta(nombre, true);
        encuadrar(true);
      }
    };
    window.addEventListener(EVENTO_BARRIO, alElegir);

    const alCambiarTamano = () => {
      clearTimeout(espera);
      espera = setTimeout(() => encuadrar(false), 200);
    };
    window.addEventListener("resize", alCambiarTamano);

    import("maplibre-gl")
      .then((lib) => {
        if (cancelado) return;
        lib.setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());
        try {
          mapa = new lib.Map({
            container: host,
            style: ESTILO_MAPA,
            bounds: cajaDe(barrioPorNombre(BARRIO_INICIAL).ruta),
            fitBoundsOptions: { padding: margen(undefined), maxZoom: 15.5 },
            interactive: false,
            attributionControl: { compact: true, customAttribution: CREDITO_RUTAS },
          });
        } catch {
          // Sin WebGL: queda el fondo liso y el texto se lee igual.
          return;
        }
        const instancia = mapa;
        instancia.setMissingStyleImageResolver((id) => {
          if (!instancia.hasImage(id)) instancia.addImage(id, { width: 1, height: 1, data: new Uint8Array(4) });
        });
        instancia.on("load", () => {
          if (cancelado) return;
          listo = true;
          pintarEstilo(instancia);
          instancia.addSource("cupos", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: RUTAS_CUPOS.map((ruta) => ({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: ruta } })),
            },
          });
          instancia.addLayer({
            id: "cupos",
            type: "line",
            source: "cupos",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-width": 3, "line-dasharray": [0.4, 2.2], "line-opacity": 0, "line-opacity-transition": { duration: 300, delay: 0 } },
          });
          instancia.addSource("ruta", { type: "geojson", data: lineaVacia() });
          instancia.addLayer({ id: "ruta-borde", type: "line", source: "ruta", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-width": 11 } });
          instancia.addLayer({ id: "ruta", type: "line", source: "ruta", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-width": 6 } });
          pintarLineas();

          // La U, con el pin del logo en la versión del modo actual.
          new lib.Marker({
            anchor: "bottom",
            element: elemento(
              "marca-u",
              '<img class="solo-oscuro" src="/brand/icono-oscuro.png" alt="" width="34" height="45"><img class="solo-claro" src="/brand/icono-claro.png" alt="" width="34" height="45"><span>Universidad Santo Tomás</span>',
            ),
          })
            .setLngLat([SEDE.lng, SEDE.lat])
            .addTo(instancia);
          const inicio = barrioPorNombre(BARRIO_INICIAL).punto;
          origen = new lib.Marker({ element: elemento("marca-origen", "<i></i><span>Te recogen aquí</span>") }).setLngLat([inicio.lng, inicio.lat]).addTo(instancia);
          // Tres ofertas de ejemplo alrededor del punto de recogida (en píxeles).
          for (const [precio, x, y] of [["$7.000", -78, -46], ["$6.500", 70, -64], ["$8.000", -40, 64]] as const) {
            ofertas.push(
              new lib.Marker({ element: elemento("marca-oferta capa-ofertas", `<i></i>${precio}`), offset: [x, y] })
                .setLngLat([inicio.lng, inicio.lat])
                .addTo(instancia),
            );
          }
          for (const salida of SALIDAS_EJEMPLO) {
            const punto = barrioPorNombre(salida.barrio).punto;
            new lib.Marker({ element: elemento("marca-salida capa-cupos", `<i></i>${salida.hora}`) }).setLngLat([punto.lng, punto.lat]).addTo(instancia);
          }

          dibujarRuta(rutaVisible(), false);
          if (activa) activar(activa);
          quitarTema = escucharTema(() => {
            pintarEstilo(instancia);
            pintarLineas();
          });
        });
      })
      .catch(() => {
        // Si la librería no carga, la portada sigue sin mapa.
      });

    // La sección que cruza la mitad de la pantalla es la que manda en el plano.
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) if (entrada.isIntersecting) activar(entrada.target as HTMLElement);
      },
      { rootMargin: "-48% 0px -48% 0px" },
    );
    document.querySelectorAll<HTMLElement>("[data-foco]").forEach((seccion) => observador.observe(seccion));

    return () => {
      cancelado = true;
      cancelAnimationFrame(cuadro);
      clearTimeout(espera);
      observador.disconnect();
      quitarTema?.();
      window.removeEventListener(EVENTO_BARRIO, alElegir);
      window.removeEventListener("resize", alCambiarTamano);
      mapa?.remove();
      host.replaceChildren();
    };
  }, []);

  return <div ref={contenedor} className="plano" role="img" aria-label="Mapa de Villavicencio con la ruta por las vías desde tu barrio hasta la Universidad Santo Tomás" />;
}
