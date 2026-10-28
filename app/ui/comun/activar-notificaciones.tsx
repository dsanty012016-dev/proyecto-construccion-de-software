"use client";

import { useEffect, useState } from "react";
import { activarNotificaciones, desactivarNotificaciones } from "@/app/lib/acciones-avisos";
import { claveVapidABytes } from "@/app/lib/avisos";

// Tarjeta para activar las notificaciones en este celular (fase 12). El
// navegador pregunta el permiso solo al tocar el botón. En el inicio se puede
// cerrar ("Ahora no", 14 días) y no aparece si ya están activas; en el perfil
// siempre está, para activarlas o apagarlas.
// En iPhone solo funcionan con UniGo instalada (Safari no las da en la web).

type Estado =
  | { paso: "cargando" }
  | { paso: "no-disponible" }
  | { paso: "instalar-primero" }
  | { paso: "bloqueadas" }
  | { paso: "apagadas" }
  | { paso: "activas"; endpoint: string };

const CLAVE_CERRADO = "unigo-avisos-cerrado";
const DIAS_OCULTO = 14;
const CLAVE_VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function instalada() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function cerradoHace(): boolean {
  try {
    const guardado = Number(localStorage.getItem(CLAVE_CERRADO));
    return Number.isFinite(guardado) && Date.now() - guardado < DIAS_OCULTO * 86_400_000;
  } catch {
    return false;
  }
}

async function estadoActual(): Promise<Estado> {
  const esIphone = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (esIphone && !instalada()) return { paso: "instalar-primero" };
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window) || !claveVapidABytes(CLAVE_VAPID)) {
    return { paso: "no-disponible" };
  }
  if (Notification.permission === "denied") return { paso: "bloqueadas" };
  const registro = await navigator.serviceWorker.getRegistration();
  const suscripcion = await registro?.pushManager.getSubscription();
  return suscripcion ? { paso: "activas", endpoint: suscripcion.endpoint } : { paso: "apagadas" };
}

export function ActivarNotificaciones({ enPerfil = false }: { enPerfil?: boolean }) {
  const [estado, setEstado] = useState<Estado>({ paso: "cargando" });
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oculta, setOculta] = useState(false);

  useEffect(() => {
    let vigente = true;
    estadoActual()
      .then((nuevo) => {
        if (vigente) setEstado(nuevo);
      })
      .catch(() => {
        if (vigente) setEstado({ paso: "no-disponible" });
      });
    return () => {
      vigente = false;
    };
  }, []);

  async function activar() {
    setTrabajando(true);
    setError(null);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado({ paso: permiso === "denied" ? "bloqueadas" : "apagadas" });
        return;
      }
      const registro = await navigator.serviceWorker.ready;
      const suscripcion =
        (await registro.pushManager.getSubscription()) ??
        (await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveVapidABytes(CLAVE_VAPID)! }));
      const respuesta = await activarNotificaciones(suscripcion.toJSON());
      if (!respuesta.ok) {
        setError(respuesta.mensaje);
        return;
      }
      setEstado({ paso: "activas", endpoint: suscripcion.endpoint });
    } catch {
      setError("No pudimos activar las notificaciones en este celular. Intenta de nuevo.");
    } finally {
      setTrabajando(false);
    }
  }

  async function apagar(endpoint: string) {
    setTrabajando(true);
    setError(null);
    try {
      const registro = await navigator.serviceWorker.getRegistration();
      await (await registro?.pushManager.getSubscription())?.unsubscribe();
      await desactivarNotificaciones(endpoint);
      setEstado({ paso: "apagadas" });
    } catch {
      setError("No pudimos apagar las notificaciones. Intenta de nuevo.");
    } finally {
      setTrabajando(false);
    }
  }

  function cerrar() {
    try {
      localStorage.setItem(CLAVE_CERRADO, String(Date.now()));
    } catch {
      // Sin almacenamiento (modo privado): solo se oculta por ahora.
    }
    setOculta(true);
  }

  if (oculta || estado.paso === "cargando" || estado.paso === "no-disponible") return null;
  // En el inicio solo se invita a activarlas; lo demás se ve en el perfil.
  if (!enPerfil && (estado.paso !== "apagadas" || cerradoHace())) return null;

  const boton =
    "flex min-h-11 flex-1 items-center justify-center rounded-xl bg-primario px-4 font-titulo text-sm font-semibold text-texto hover:bg-primario/85 disabled:opacity-70";

  return (
    <section aria-labelledby="titulo-notificaciones" className="space-y-3 rounded-2xl border border-secundario/40 p-4">
      <div>
        <h2 id="titulo-notificaciones" className="text-base">
          {estado.paso === "activas" ? "Notificaciones activas" : "Activa las notificaciones"}
        </h2>
        <p className="text-sm text-texto-suave">
          {estado.paso === "activas"
            ? "Te avisamos en este celular cuando llegue una oferta, te aprueben un puesto o tu viaje cambie."
            : estado.paso === "instalar-primero"
              ? "En iPhone, las notificaciones llegan solo con UniGo instalada en la pantalla de inicio. Instálala y actívalas desde ahí."
              : estado.paso === "bloqueadas"
                ? "Las bloqueaste para UniGo. Actívalas en los ajustes del navegador o del celular, en Notificaciones."
                : "Te avisamos cuando llegue una oferta, te aprueben un puesto o tu viaje cambie, aunque no tengas la app abierta."}
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      {(estado.paso === "apagadas" || estado.paso === "activas") && (
        <div className="flex gap-2">
          {estado.paso === "apagadas" ? (
            <button type="button" onClick={activar} disabled={trabajando} className={boton}>
              {trabajando ? "Activando…" : "Activar notificaciones"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => apagar(estado.endpoint)}
              disabled={trabajando}
              className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-texto-suave/30 px-4 text-sm font-semibold text-texto hover:bg-superficie disabled:opacity-70"
            >
              {trabajando ? "Apagando…" : "Apagar en este celular"}
            </button>
          )}
          {!enPerfil && (
            <button
              type="button"
              onClick={cerrar}
              className="flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-texto-suave hover:text-texto"
            >
              Ahora no
            </button>
          )}
        </div>
      )}
    </section>
  );
}
