import Link from "next/link";
import { DOMINIO_INSTITUCIONAL } from "@/app/lib/validaciones-auth";
import { EscenaRuta } from "./escena-ruta";
import { BOTON_BORDE, BOTON_PRINCIPAL } from "./estilos";
import { MapaRespaldo } from "./mapa-respaldo";
import { IconoEstrella } from "@/app/ui/comun/iconos-app";

// Portada: la pregunta de siempre en el grupo de chat y cómo UniGo la
// responde con ofertas. Detrás, el mapa de la ruta (SVG al instante; escena
// 3D de A-Frame encima cuando el navegador puede, ver escena-ruta.tsx).

const MENSAJES = [
  { quien: "Laura", azul: true, texto: "¿Alguien va pa’ la U a las 7? Salgo de Barzal", hora: "6:41" },
  { quien: "Kevin", azul: false, texto: "yo voy pero ya voy lleno", hora: "6:44" },
  { quien: "Laura", azul: true, texto: "¿nadie más?", hora: "6:52" },
];

const OFERTAS = [
  { iniciales: "AR", nombre: "Andrés R.", nota: "4,9", detalle: "Spark gris · KDS 482", precio: "$7.000" },
  { iniciales: "VC", nombre: "Valentina C.", nota: null, detalle: "Nueva · Logan blanco", precio: "$7.500" },
  { iniciales: "JM", nombre: "Julián M.", nota: "4,7", detalle: "moto", precio: "$9.000" },
];

// Cada elemento del chat entra un poco después del anterior (solo si la
// persona no pidió menos movimiento: motion-safe).
const ENTRADA = "motion-safe:animate-[aparecer_520ms_cubic-bezier(0.16,1,0.3,1)_both]";

export function Portada() {
  return (
    <section aria-labelledby="titulo-portada" className="relative isolate">
      <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-45">
        <MapaRespaldo />
        <EscenaRuta />
      </div>

      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-[clamp(2.5rem,6vw,5rem)] px-5 pt-[clamp(2rem,6vw,5.5rem)] pb-[clamp(3.5rem,8vw,7rem)]">
        <div className="flex min-w-0 flex-[1_1_28rem] flex-col gap-6">
          <h1 id="titulo-portada" className="text-[clamp(2.75rem,7.2vw,6rem)] leading-[0.98] font-extrabold tracking-[-0.04em]">
            ¿Alguien va pa’ la U?
          </h1>
          <p className="max-w-[34ch] text-[clamp(1.125rem,1.6vw,1.3rem)] leading-normal text-texto-suave text-pretty">
            Deja de preguntar en el grupo. En UniGo, conductores que también estudian en la Santo Tomás te ofrecen su precio y tú
            eliges.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/registro" className={BOTON_PRINCIPAL}>
              Crear mi cuenta de estudiante
            </Link>
            <a href="#conducir" className={BOTON_BORDE}>
              Quiero conducir
            </a>
          </div>
          <p className="text-sm text-texto-suave">
            Solo con tu correo <strong className="font-semibold text-texto">@{DOMINIO_INSTITUCIONAL}</strong>
          </p>
        </div>

        {/* Ilustración: el chat del grupo y las ofertas de UniGo (datos de ejemplo). */}
        <div
          aria-hidden="true"
          className="mx-auto w-full max-w-[420px] min-w-0 flex-[1_1_22rem] overflow-hidden rounded-[2rem] border border-texto-suave/20 bg-fondo shadow-[0_40px_80px_-30px_color-mix(in_srgb,var(--color-primario)_45%,transparent)]"
        >
          <div className="flex items-center gap-2.5 border-b border-texto-suave/15 px-[18px] py-4">
            <span className="flex size-9 items-center justify-center rounded-full bg-superficie font-titulo text-[13px] font-bold text-texto-suave">VU</span>
            <span>
              <span className="block text-[15px] font-bold">Viajes U</span>
              <span className="block text-xs text-texto-suave">grupo de ejemplo</span>
            </span>
          </div>
          <div className="flex flex-col gap-2 p-4 text-sm">
            {MENSAJES.map((m, i) => (
              <p
                key={i}
                className={`max-w-[78%] self-start rounded-[4px_16px_16px_16px] bg-superficie px-3 py-2 ${ENTRADA}`}
                style={{ animationDelay: `${300 + i * 650}ms` }}
              >
                <span className={`block text-xs font-bold ${m.azul ? "text-secundario" : "text-texto-suave"}`}>{m.quien}</span>
                {m.texto}
                <span className="block text-right text-[11px] text-texto-suave">{m.hora}</span>
              </p>
            ))}
          </div>
          <div className={`flex items-center gap-2.5 px-4 text-xs font-bold text-secundario ${ENTRADA}`} style={{ animationDelay: "2300ms" }}>
            <span className="h-px flex-1 bg-secundario/35" />
            Con UniGo
            <span className="h-px flex-1 bg-secundario/35" />
          </div>
          <div className={`m-4 mt-3.5 flex flex-col gap-1 rounded-[20px] bg-superficie p-4 ${ENTRADA}`} style={{ animationDelay: "2700ms" }}>
            <p className="mb-1.5 font-titulo text-base font-bold">3 ofertas para tu viaje</p>
            {OFERTAS.map((o) => (
              <div key={o.nombre} className="flex items-center gap-2.5 border-b border-texto-suave/15 py-2 last:border-b-0">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-fondo font-titulo text-[13px] font-bold text-secundario">
                  {o.iniciales}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{o.nombre}</span>
                  <span className="flex items-center gap-1 truncate text-xs text-texto-suave">
                    {o.nota && (
                      <>
                        <IconoEstrella llena className="size-3 shrink-0 text-secundario" />
                        {o.nota} ·
                      </>
                    )}{" "}
                    {o.detalle}
                  </span>
                </span>
                <span className="font-titulo text-lg font-bold tabular-nums">{o.precio}</span>
              </div>
            ))}
            <span className="mt-2 flex h-[46px] items-center justify-center rounded-xl bg-primario font-titulo text-[15px] font-semibold">
              Aceptar y pagar $7.000
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
