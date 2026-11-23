"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { preguntarAlAsistente } from "@/app/lib/acciones-asistente";
import { MAX_LARGO_MENSAJE, NOMBRE_ASISTENTE, saludo, type AccionAsistente, type RolAsistente } from "@/app/lib/asistente";
import {
  consejoDelMomento,
  debeMostrarConsejo,
  diaEnColombia,
  expresionPorHora,
  type ConsejoUni,
  type ExpresionUni,
} from "@/app/lib/mascota";
import { UniMascota } from "./uni-mascota";

// Uni, el asistente de UniGo: un botón flotante en toda la zona privada que
// abre un chat. Ayuda a moverse por la app y a decidir (pedir ya o buscar un
// cupo según la hora), con humor pícaro pero amable. Responde la Server Action
// preguntarAlAsistente (Gemini, o el guion propio si la IA no está). Las
// conversaciones no se guardan: viven solo mientras la pantalla esté abierta.
// El botón es Uni, la mascota (uni-mascota.tsx): cambia de cara según la hora
// y, en Inicio, aparece sola con un consejo máximo una vez al día.

const CLAVE_CONSEJO = "unigo-uni-consejo";

interface Burbuja {
  de: "persona" | "asistente";
  texto: string;
  acciones?: AccionAsistente[];
}

const SUGERENCIAS: Record<RolAsistente, string[]> = {
  estudiante: ["Tengo que estar en la U a las 6", "¿Cómo pido un viaje?", "¿Qué es un cupo?", "¿Cómo recargo saldo?"],
  conductor: ["Salgo para la U a las 6:30", "¿Qué documentos necesito?", "¿Cómo retiro mi plata?", "¿Cómo consigo pasajeros?"],
};

export function Asistente({ rol, nombre = "" }: { rol: RolAsistente; nombre?: string }) {
  const [abierto, setAbierto] = useState(false);
  const [cara, setCara] = useState<ExpresionUni>("normal");
  const [consejo, setConsejo] = useState<ConsejoUni | null>(null);
  const ruta = usePathname();
  const enInicio = ruta === `/${rol}`;
  const [burbujas, setBurbujas] = useState<Burbuja[]>([]);
  const [texto, setTexto] = useState("");
  const [pensando, iniciar] = useTransition();
  const entrada = useRef<HTMLTextAreaElement>(null);
  const lista = useRef<HTMLOListElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const idPanel = useId();
  const idTitulo = useId();

  // La cara de Uni sigue la hora de Colombia (sueño de madrugada); se revisa cada minuto.
  useEffect(() => {
    const actualizar = () => setCara(expresionPorHora(new Date()));
    const primera = setTimeout(actualizar, 0);
    const cadaMinuto = setInterval(actualizar, 60_000);
    return () => {
      clearTimeout(primera);
      clearInterval(cadaMinuto);
    };
  }, []);

  // En Inicio, Uni aparece solo con un consejo: máximo uno al día (se recuerda en este celular).
  useEffect(() => {
    if (!enInicio) return;
    const ahora = new Date();
    let ultimo: string | null = null;
    try {
      ultimo = localStorage.getItem(CLAVE_CONSEJO);
    } catch {
      return;
    }
    const toca = debeMostrarConsejo(ultimo, ahora) ? consejoDelMomento(rol, ahora) : null;
    if (!toca) return;
    const espera = setTimeout(() => {
      setConsejo(toca);
      try {
        localStorage.setItem(CLAVE_CONSEJO, diaEnColombia(ahora));
      } catch {
        // Sin almacenamiento el consejo igual se ve; solo podría repetirse.
      }
    }, 1200);
    return () => clearTimeout(espera);
  }, [enInicio, rol]);

  // Al abrir por primera vez, Uni saluda por el nombre y según la hora (con el reloj del navegador).
  function abrir() {
    if (burbujas.length === 0) setBurbujas([{ de: "asistente", texto: saludo(rol, new Date(), Math.random(), nombre) }]);
    setConsejo(null);
    setAbierto(true);
  }

  function cerrar() {
    setAbierto(false);
    boton.current?.focus();
  }

  useEffect(() => {
    if (abierto) entrada.current?.focus();
  }, [abierto]);

  useEffect(() => {
    lista.current?.lastElementChild?.scrollIntoView({ block: "end" });
  }, [burbujas, pensando]);

  function enviar(mensaje: string) {
    const limpio = mensaje.trim().slice(0, MAX_LARGO_MENSAJE);
    if (!limpio || pensando) return;
    const historial = [...burbujas, { de: "persona" as const, texto: limpio }];
    setBurbujas(historial);
    setTexto("");
    iniciar(async () => {
      try {
        const respuesta = await preguntarAlAsistente(historial.map(({ de, texto }) => ({ de, texto })));
        setBurbujas((actual) => [...actual, { de: "asistente", texto: respuesta.texto, acciones: respuesta.acciones }]);
      } catch {
        setBurbujas((actual) => [...actual, { de: "asistente", texto: "Se me cayó la señal un momento. ¿Lo intentas otra vez?" }]);
      }
    });
  }

  const ultima = burbujas[burbujas.length - 1];
  const caraPanel: ExpresionUni = pensando ? "normal" : burbujas.length > 1 && ultima?.de === "asistente" ? "feliz" : cara;

  return (
    <>
      {consejo && enInicio && !abierto && (
        <div role="status" className="asistente-consejo uni-entrar fixed z-40 rounded-2xl border border-linea bg-superficie py-3 pr-1 pl-4 text-texto shadow-xl">
          <div className="flex items-start gap-1">
            <p className="flex-1 pt-1 text-sm leading-snug">
              <span className="sr-only">{NOMBRE_ASISTENTE} dice: </span>
              {consejo.texto}
            </p>
            <button
              type="button"
              onClick={() => setConsejo(null)}
              aria-label={`Cerrar el consejo de ${NOMBRE_ASISTENTE}`}
              className="-mt-2 flex size-11 shrink-0 items-center justify-center rounded-full text-texto-suave hover:text-texto"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <Link
            href={consejo.accion.ruta}
            onClick={() => setConsejo(null)}
            className="mt-1 inline-flex min-h-11 items-center rounded-full border border-secundario px-4 text-sm font-semibold text-secundario hover:bg-fondo"
          >
            {consejo.accion.etiqueta}
          </Link>
        </div>
      )}

      <button
        ref={boton}
        type="button"
        onClick={abierto ? cerrar : abrir}
        aria-expanded={abierto}
        aria-controls={idPanel}
        aria-label={abierto ? `Cerrar a ${NOMBRE_ASISTENTE}` : `Hablar con ${NOMBRE_ASISTENTE}, el asistente`}
        className={`asistente-boton fixed right-4 z-40 flex items-center justify-center rounded-full transition-transform duration-150 hover:scale-105 active:scale-95 motion-reduce:transition-none ${
          abierto ? "size-14 bg-primario text-sobre-primario shadow-lg" : "size-16"
        }`}
      >
        {abierto ? (
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <UniMascota expresion={cara} decorativa className="h-16 w-auto drop-shadow-lg" />
        )}
      </button>

      {abierto && (
        <section
          id={idPanel}
          role="dialog"
          aria-modal="false"
          aria-labelledby={idTitulo}
          onKeyDown={(e) => e.key === "Escape" && cerrar()}
          className="asistente-panel fixed right-4 left-4 z-40 flex flex-col overflow-hidden rounded-[var(--radio-panel)] border border-linea bg-superficie text-texto shadow-2xl sm:left-auto sm:w-[24rem]"
        >
          <header className="flex items-center gap-3 border-b border-linea px-4 py-3">
            <UniMascota expresion={caraPanel} decorativa quieta className="h-12 w-auto shrink-0" />
            <div className="min-w-0">
              <h2 id={idTitulo} className="font-bold leading-tight">
                {NOMBRE_ASISTENTE}, tu copiloto
              </h2>
              <p className="text-xs text-texto-suave">Te ayuda a moverte por UniGo y a decidir</p>
            </div>
          </header>

          <ol ref={lista} aria-live="polite" className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {burbujas.map((b, i) => (
              <li key={i} className={b.de === "persona" ? "flex justify-end" : "flex flex-col items-start gap-2"}>
                <p
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line ${
                    b.de === "persona" ? "bg-primario text-sobre-primario" : "bg-fondo text-texto"
                  }`}
                >
                  <span className="sr-only">{b.de === "persona" ? "Tú: " : `${NOMBRE_ASISTENTE}: `}</span>
                  {b.texto}
                </p>
                {b.acciones && b.acciones.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {b.acciones.map((a) => (
                      <Link
                        key={a.ruta}
                        href={a.ruta}
                        onClick={() => setAbierto(false)}
                        className="inline-flex min-h-11 items-center rounded-full border border-secundario px-4 text-sm font-semibold text-secundario hover:bg-fondo"
                      >
                        {a.etiqueta}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            ))}
            {pensando && (
              <li className="text-sm text-texto-suave" aria-label={`${NOMBRE_ASISTENTE} está escribiendo`}>
                {NOMBRE_ASISTENTE} está pensando…
              </li>
            )}
          </ol>

          {burbujas.length <= 1 && (
            <div className="flex gap-2 overflow-x-auto px-4 pb-2" aria-label="Preguntas sugeridas">
              {SUGERENCIAS[rol].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => enviar(s)}
                  className="min-h-11 shrink-0 rounded-full border border-linea px-3 text-sm whitespace-nowrap text-texto hover:border-secundario"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar(texto);
            }}
            className="flex items-end gap-2 border-t border-linea px-3 py-3"
          >
            <label htmlFor={`${idPanel}-texto`} className="sr-only">
              Escríbele a {NOMBRE_ASISTENTE}
            </label>
            <textarea
              id={`${idPanel}-texto`}
              ref={entrada}
              rows={1}
              value={texto}
              maxLength={MAX_LARGO_MENSAJE}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviar(texto);
                }
              }}
              placeholder="Ej.: voy a la U a las 7"
              className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-linea bg-fondo px-3 py-2.5 text-sm text-texto placeholder:text-texto-suave"
            />
            <button
              type="submit"
              disabled={pensando || !texto.trim()}
              className="prensa inline-flex min-h-11 items-center rounded-xl bg-primario px-4 text-sm font-bold text-sobre-primario disabled:opacity-50"
            >
              Enviar
            </button>
          </form>
          <p className="px-4 pb-3 text-[0.7rem] leading-snug text-texto-suave">
            Las respuestas las genera la IA Gemini de Google y pueden equivocarse. No escribas datos personales.
          </p>
        </section>
      )}
    </>
  );
}
