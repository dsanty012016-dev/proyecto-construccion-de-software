"use client";

import { useEffect, useState } from "react";

// Invita a instalar UniGo en el celular (es una app web: queda con su ícono y
// abre a pantalla completa, sin tiendas). En Android/Chrome usa el aviso del
// navegador; en iPhone no se puede, así que explica los dos toques en Safari.
// No aparece si ya está instalada. En el inicio se puede cerrar ("Ahora no")
// y no vuelve en 14 días; en el perfil siempre está.

interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Modo = "nada" | "android" | "iphone";

const CLAVE = "unigo-instalar-cerrado";
const DIAS_OCULTO = 14;

function yaInstalada() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function esIphone() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function cerradoHace(): boolean {
  try {
    const guardado = Number(localStorage.getItem(CLAVE));
    return Number.isFinite(guardado) && Date.now() - guardado < DIAS_OCULTO * 86_400_000;
  } catch {
    return false;
  }
}

export function InstalarApp({ cerrable = false }: { cerrable?: boolean }) {
  const [modo, setModo] = useState<Modo>("nada");
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [verPasos, setVerPasos] = useState(false);

  useEffect(() => {
    if (yaInstalada() || (cerrable && cerradoHace())) return;
    if (esIphone()) {
      // El navegador solo avisa después de pintar; esto evita el parpadeo al hidratar.
      const id = window.setTimeout(() => setModo("iphone"), 0);
      return () => window.clearTimeout(id);
    }
    function alPoder(e: Event) {
      e.preventDefault();
      setEvento(e as EventoInstalar);
      setModo("android");
    }
    function alInstalar() {
      setModo("nada");
    }
    window.addEventListener("beforeinstallprompt", alPoder);
    window.addEventListener("appinstalled", alInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", alPoder);
      window.removeEventListener("appinstalled", alInstalar);
    };
  }, [cerrable]);

  if (modo === "nada") return null;

  async function instalar() {
    if (!evento) return;
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    if (outcome === "accepted") setModo("nada");
    setEvento(null);
  }

  function cerrar() {
    try {
      localStorage.setItem(CLAVE, String(Date.now()));
    } catch {
      // Sin almacenamiento (modo privado): solo se oculta por ahora.
    }
    setModo("nada");
  }

  return (
    <section aria-labelledby="titulo-instalar" className="space-y-3 rounded-2xl border border-secundario/40 p-4">
      <div>
        <h2 id="titulo-instalar" className="text-base">
          Instala UniGo en tu celular
        </h2>
        <p className="text-sm text-texto-suave">Queda con su ícono y abre a pantalla completa, como una app. Gratis y sin tiendas.</p>
      </div>
      {modo === "iphone" && verPasos && (
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>
            En Safari, toca <strong>Compartir</strong> (el cuadro con la flecha hacia arriba).
          </li>
          <li>
            Elige <strong>Agregar a inicio</strong> y luego <strong>Agregar</strong>.
          </li>
        </ol>
      )}
      <div className="flex gap-2">
        {modo === "android" ? (
          <button
            type="button"
            onClick={instalar}
            className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-primario px-4 font-titulo text-sm font-semibold text-texto hover:bg-primario/85"
          >
            Instalar UniGo
          </button>
        ) : (
          !verPasos && (
            <button
              type="button"
              onClick={() => setVerPasos(true)}
              aria-expanded={verPasos}
              className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-primario px-4 font-titulo text-sm font-semibold text-texto hover:bg-primario/85"
            >
              Cómo instalarla
            </button>
          )
        )}
        {cerrable && (
          <button
            type="button"
            onClick={cerrar}
            className="flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-texto-suave hover:text-texto"
          >
            Ahora no
          </button>
        )}
      </div>
    </section>
  );
}
