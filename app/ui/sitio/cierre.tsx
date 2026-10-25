import Link from "next/link";
import { comision, gananciaConductor, PORCENTAJE_COMISION } from "@/app/lib/comision";
import { pesos } from "@/app/lib/formato";
import { AIRE, BOTON_BORDE, SECCION, TITULO_SECCION } from "./estilos";

// Últimas secciones de la landing: para conductores, el equipo y el cierre.

const PRECIO_EJEMPLO = 7_000;

export function Conducir() {
  return (
    <section id="conducir" aria-labelledby="titulo-conducir" className={`${SECCION} ${AIRE} flex flex-wrap items-center gap-x-[4.5rem] gap-y-10`}>
      <div className="min-w-0 flex-[1_1_24rem]">
        <h2 id="titulo-conducir" className={TITULO_SECCION}>
          ¿Ya vas para la U en carro o moto?
        </h2>
        <p className="mt-5 max-w-[44ch] text-lg leading-relaxed text-texto-suave">
          Lleva a un compañero y pon tu propio precio. Registras tu vehículo, subes tus documentos y, cuando los aprueben, te pones disponible
          o publicas tu hora de salida.
        </p>
        <Link href="/registro" className={`mt-7 ${BOTON_BORDE}`}>
          Quiero conducir
        </Link>
      </div>
      {/* Ejemplo de la pantalla de ofertar, con la cuenta real de la comisión. */}
      <div aria-hidden="true" className="flex w-full max-w-[440px] min-w-0 flex-[1_1_20rem] flex-col gap-4 rounded-3xl bg-superficie p-6">
        <span className="text-center text-sm font-semibold text-texto-suave">Tu precio</span>
        <span className="text-center font-titulo text-5xl font-extrabold tracking-[-0.03em] tabular-nums">{pesos(PRECIO_EJEMPLO)}</span>
        <span className="grid grid-cols-[minmax(0,1fr)_auto] gap-y-2 border-t border-texto-suave/15 pt-3.5 text-[15px] tabular-nums">
          <span className="text-texto-suave">Comisión UniGo ({PORCENTAJE_COMISION} %)</span>
          <span className="text-right text-texto-suave">−{pesos(comision(PRECIO_EJEMPLO))}</span>
          <span className="font-bold">Recibes al terminar</span>
          <span className="text-right font-titulo font-bold text-secundario">{pesos(gananciaConductor(PRECIO_EJEMPLO))}</span>
        </span>
      </div>
    </section>
  );
}

const INTEGRANTES = [
  { iniciales: "DC", nombre: "Dilan Santiago Chavarro Parra", rol: "Desarrollo, diseño de la experiencia y gestión del proyecto" },
  { iniciales: "DD", nombre: "David Eduardo Durán Acevedo", rol: "Desarrollo, gestión del proyecto y pruebas" },
];

export function Equipo() {
  return (
    <section aria-labelledby="titulo-equipo" className={`${SECCION} ${AIRE} flex flex-wrap items-end gap-x-[4.5rem] gap-y-8`}>
      <div className="min-w-0 flex-[1_1_24rem]">
        <h2 id="titulo-equipo" className="text-[clamp(2rem,4vw,3rem)] leading-[1.05] font-extrabold tracking-[-0.03em]">
          De estudiantes para estudiantes.
        </h2>
        <p className="mt-4 max-w-[46ch] text-[17px] leading-relaxed text-texto-suave">
          UniGo es un proyecto académico de estudiantes de la Universidad Santo Tomás, seccional Villavicencio, que también necesitan llegar a
          clase a tiempo.
        </p>
      </div>
      <ul className="min-w-0 flex-[1_1_24rem] border-b border-texto-suave/20">
        {INTEGRANTES.map((p) => (
          <li key={p.nombre} className="flex items-center gap-4 border-t border-texto-suave/20 py-4">
            <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-superficie font-titulo font-bold text-secundario">
              {p.iniciales}
            </span>
            <span>
              <span className="block font-bold">{p.nombre}</span>
              <span className="block text-sm text-texto-suave">{p.rol}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Cierre() {
  return (
    <section aria-labelledby="titulo-cierre" className={`px-5 ${AIRE}`}>
      <div className="zona-azul mx-auto flex max-w-[1200px] flex-col items-center gap-[22px] rounded-[2rem] bg-primario px-[clamp(1.5rem,5vw,4.5rem)] py-[clamp(3rem,7vw,6rem)] text-center">
        <h2 id="titulo-cierre" className="text-[clamp(2.5rem,6.4vw,5.25rem)] leading-[0.98] font-extrabold tracking-[-0.04em] text-balance">
          Tu viaje, tu universidad.
        </h2>
        <Link
          href="/registro"
          className="inline-flex min-h-14 items-center rounded-full bg-texto px-7 font-titulo text-[17px] font-bold text-fondo transition-colors hover:bg-texto/90"
        >
          Crear mi cuenta de estudiante
        </Link>
        <p className="text-[15px]">
          ¿Ya tienes cuenta?{" "}
          <Link href="/entrar" className="font-bold text-texto underline underline-offset-[3px]">
            Entrar
          </Link>
        </p>
      </div>
    </section>
  );
}
