"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { type Coordenada } from "@/app/lib/mapa";
import { compararParadas, type ComparacionDeParadas } from "@/app/lib/orden-paradas";
import { buscarTiempos } from "@/app/lib/ruta-vial";
import { Mapa } from "@/app/ui/comun/mapa";

interface Parada {
  id: string;
  punto: Coordenada;
  lugar: string;
  detalle: ReactNode;
}

interface Props {
  cupoId: string;
  salida: Coordenada;
  destino: Coordenada;
  regreso: boolean;
  publicado: boolean;
  confirmadas: Parada[];
  otrasParadas: Coordenada[];
  solicitudes?: ReactNode;
  seguimiento?: ReactNode;
  porPagar?: ReactNode;
}

function desdeSesion(clave: string): string | null {
  try {
    return sessionStorage.getItem(clave);
  } catch {
    return null;
  }
}

function escucharSesion(avisar: () => void) {
  window.addEventListener("pageshow", avisar);
  window.addEventListener("storage", avisar);
  return () => {
    window.removeEventListener("pageshow", avisar);
    window.removeEventListener("storage", avisar);
  };
}

function ordenGuardado(guardado: string | null, firma: string, ids: string[]): string[] | null {
  if (!guardado) return null;
  try {
    const datos = JSON.parse(guardado);
    if (datos.firma !== firma || !Array.isArray(datos.orden)) return null;
    const orden: string[] = datos.orden;
    if (orden.length !== ids.length || new Set(orden).size !== ids.length || !orden.every((id) => ids.includes(id))) return null;
    return orden;
  } catch {
    return null;
  }
}

function duracionTexto(segundos: number) {
  if (segundos > 0 && segundos < 60) return "menos de 1 min";
  return `${Math.round(segundos / 60)} min`;
}

export function RecorridoCupo({
  cupoId, salida, destino, regreso, publicado, confirmadas, otrasParadas, solicitudes, seguimiento, porPagar,
}: Props) {
  const clave = `unigo:recorrido:${cupoId}`;
  const ids = confirmadas.map(({ id }) => id);
  const firma = JSON.stringify([salida, destino, confirmadas.map(({ id, punto }) => [id, punto])]);
  const enSesion = useSyncExternalStore(escucharSesion, () => desdeSesion(clave), () => null);
  const [enMemoria, setEnMemoria] = useState<string | null | undefined>(undefined);
  const aplicado = ordenGuardado(enMemoria === undefined ? enSesion : enMemoria, firma, ids);
  const porId = new Map(confirmadas.map((parada) => [parada.id, parada]));
  const recorrido = (aplicado ?? ids).map((id) => porId.get(id)!);
  const hayConfirmadas = recorrido.length > 0;
  const [estado, setEstado] = useState<"inicial" | "consultando" | "error">("inicial");
  const [comparacion, setComparacion] = useState<ComparacionDeParadas | null>(null);
  const ahorro = comparacion ? comparacion.segundosActuales - comparacion.segundosSugeridos : 0;
  const tipo = regreso ? "bajada" : "recogida";

  async function comparar() {
    setEstado("consultando");
    const tiempos = await buscarTiempos([salida, ...confirmadas.map(({ punto }) => punto), destino]);
    const resultado = tiempos && compararParadas(tiempos);
    setComparacion(resultado);
    setEstado(resultado ? "inicial" : "error");
  }

  function guardar(orden: string[] | null) {
    const valor = orden ? JSON.stringify({ firma, orden }) : null;
    setEnMemoria(valor);
    try {
      if (valor === null) sessionStorage.removeItem(clave);
      else sessionStorage.setItem(clave, valor);
    } catch {
      // La selección sigue disponible mientras el conductor esté en la pantalla.
    }
  }

  return (
    <>
      <Mapa
        etiqueta={hayConfirmadas ? `Mapa del cupo con las ${tipo}s numeradas en orden` : "Mapa del cupo con las solicitudes"}
        centro={salida}
        origen={salida}
        destino={destino}
        paradas={hayConfirmadas ? recorrido.map(({ punto }) => punto) : otrasParadas}
        numerarParadas={hayConfirmadas}
        uEnElOrigen={regreso}
        className="h-56"
      />
      {seguimiento}

      {publicado && hayConfirmadas && (
        <section aria-labelledby="titulo-comparar" className="space-y-3 rounded-2xl border border-linea bg-superficie p-4">
          <h2 id="titulo-comparar" className="text-base">Comparar recorrido</h2>
          <p role="status" className="text-sm text-texto-suave">
            {aplicado ? "El mapa y la lista muestran el orden sugerido."
              : estado === "consultando" ? "Calculando el tiempo por las calles…"
              : estado === "error" ? "No pudimos calcular los tiempos. Puedes reintentar o seguir con el orden actual."
              : comparacion ? (ahorro > 0 ? "Encontramos un recorrido más corto." : "El orden actual ya da el menor tiempo estimado.")
              : "Consulta el tiempo por las calles para los puestos pagados."}
          </p>
          {comparacion && (
            <>
              <div className="flex flex-wrap gap-x-5 gap-y-1 border-y border-linea py-2 text-sm tabular-nums">
                <p>Orden inicial <strong>{duracionTexto(comparacion.segundosActuales)}</strong></p>
                {ahorro > 0 && (
                  <>
                    <p>Orden sugerido <strong>{duracionTexto(comparacion.segundosSugeridos)}</strong></p>
                    <p className="text-secundario">Ahorro estimado <strong>{duracionTexto(ahorro)}</strong></p>
                  </>
                )}
              </div>
              <ol aria-label={ahorro > 0 ? "Orden sugerido y tiempo adicional por parada" : "Tiempo adicional por parada"} className="list-decimal space-y-1.5 ps-5 text-sm">
                {comparacion.orden.map((indice, i) => {
                  const parada = confirmadas[indice - 1];
                  const segundos = comparacion.adicionales[i];
                  return (
                    <li key={parada.id}>
                      <div className="flex flex-wrap justify-between gap-x-3">
                        <span className="min-w-0 break-words">{parada.lugar}</span>
                        <span className="shrink-0 text-texto-suave">
                          {segundos === null ? "Sin estimación" : `Añade ${duracionTexto(segundos)}`}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <p className="text-xs text-texto-suave">Estimaciones de conducción. Suma el tiempo de espera en cada parada.</p>
            </>
          )}
          {aplicado ? (
            <button type="button" onClick={() => guardar(null)} className="min-h-11 rounded-xl border border-linea px-3 text-sm font-semibold hover:bg-fondo">
              Volver al orden inicial
            </button>
          ) : comparacion ? (
            ahorro > 0 && (
              <button type="button" onClick={() => guardar(comparacion.orden.map((i) => confirmadas[i - 1].id))}
                className="prensa min-h-11 rounded-xl bg-primario px-3 py-2 text-sm font-bold text-sobre-primario">
                Usar orden sugerido
              </button>
            )
          ) : (
            <button type="button" onClick={comparar} disabled={estado === "consultando"}
              className="min-h-11 rounded-xl border border-linea px-3 text-sm font-semibold hover:bg-fondo disabled:opacity-60">
              {estado === "error" ? "Reintentar cálculo" : "Calcular tiempos"}
            </button>
          )}
        </section>
      )}

      {solicitudes}
      <section aria-labelledby="titulo-aprobados" className="space-y-3">
        <h2 id="titulo-aprobados" className="text-lg">
          {recorrido.length > 1 ? (regreso ? "Orden de bajada" : "Orden de recogida") : "Van contigo"}
        </h2>
        {hayConfirmadas ? (
          <ol className="space-y-3">
            {recorrido.map(({ id, detalle }, i) => (
              <li key={id} className="flex gap-3 rounded-2xl bg-superficie p-4">
                <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-texto font-titulo text-sm font-bold text-fondo">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-3">
                  <span className="sr-only">{regreso ? "Bajada" : "Recogida"} {i + 1}</span>
                  {detalle}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-texto-suave">{porPagar ? "Aún no hay puestos pagados." : "Todavía no has aprobado a nadie."}</p>
        )}
        {porPagar}
      </section>
    </>
  );
}
