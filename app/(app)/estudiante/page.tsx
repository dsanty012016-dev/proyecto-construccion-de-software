import type { Metadata } from "next";
import Link from "next/link";
import { historialDeViajes, viajeActivoDelEstudiante } from "@/app/lib/consultas-viaje";
import { etiquetaEstado, fechaCorta, nombreCorto, pesos } from "@/app/lib/formato";
import { exigirRol } from "@/app/lib/sesion";
import { Aviso } from "@/app/ui/auth/campos";
import { BotonCambiarModo } from "@/app/ui/comun/boton-cambiar-modo";
import { IconoViajes } from "@/app/ui/comun/iconos-app";
import { RutaViaje } from "@/app/ui/comun/ruta-viaje";

export const metadata: Metadata = { title: "Inicio" };

// Inicio del estudiante: pedir un viaje, o volver al que ya tiene en marcha.
export default async function PaginaEstudiante({ searchParams }: { searchParams: Promise<{ clave?: string }> }) {
  const { usuario, perfil } = await exigirRol("estudiante");
  const { clave } = await searchParams;
  const [activo, historial] = await Promise.all([viajeActivoDelEstudiante(usuario.id), historialDeViajes(usuario.id)]);
  const ultimo = historial.find((h) => h.viaje.estado === "terminado");
  const porCalificar = ultimo && !ultimo.calificado ? ultimo : null;

  return (
    <main className="space-y-6 px-5 pt-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-texto-suave">Estudiante</p>
          <h1 className="text-3xl tracking-tight">Hola, {perfil.nombre.split(" ")[0]}</h1>
        </div>
        <BotonCambiarModo modoActual="estudiante" />
      </header>

      {clave === "actualizada" && <Aviso tipo="listo">Tu contraseña quedó actualizada.</Aviso>}

      {activo ? (
        <section aria-labelledby="titulo-activo" className="space-y-4 rounded-2xl bg-superficie p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="titulo-activo" className="text-lg">
              {etiquetaEstado(activo.viaje.estado)}
            </h2>
            {activo.viaje.estado === "solicitado" && (
              <span className="rounded-full bg-primario px-3 py-1 text-xs font-semibold text-texto">
                {activo.ofertas.length === 0 ? "Sin ofertas aún" : `${activo.ofertas.length} ${activo.ofertas.length === 1 ? "oferta" : "ofertas"}`}
              </span>
            )}
          </div>
          <RutaViaje origen={activo.viaje.origen_texto} destino={activo.viaje.destino_texto} />
          <Link
            href="/estudiante/viaje"
            className="flex h-14 w-full items-center justify-center rounded-xl bg-primario font-titulo font-semibold text-texto transition-colors hover:bg-primario/85"
          >
            {activo.viaje.estado === "solicitado" ? "Ver ofertas" : "Ver mi viaje"}
          </Link>
        </section>
      ) : (
        <section aria-labelledby="titulo-pedir" className="space-y-4 rounded-2xl bg-superficie p-5">
          <h2 id="titulo-pedir" className="text-xl">
            ¿A dónde vas hoy?
          </h2>
          <p className="text-sm text-texto-suave">Pide tu viaje a la universidad y elige la oferta de un conductor.</p>
          <Link
            href="/estudiante/pedir"
            className="flex h-14 w-full items-center justify-center rounded-xl bg-primario font-titulo font-semibold text-texto transition-colors hover:bg-primario/85"
          >
            Pedir viaje
          </Link>
        </section>
      )}

      {porCalificar && (
        <section aria-labelledby="titulo-calificar" className="space-y-3 rounded-2xl border border-secundario/40 p-5">
          <h2 id="titulo-calificar" className="text-lg">
            ¿Cómo te fue{porCalificar.otraPersona ? ` con ${nombreCorto(porCalificar.otraPersona)}` : ""}?
          </h2>
          <Link
            href={`/viajes/${porCalificar.viaje.id}/calificar`}
            className="flex min-h-12 w-full items-center justify-center rounded-xl border border-texto-suave/30 font-semibold text-texto hover:bg-superficie"
          >
            Calificar el viaje
          </Link>
        </section>
      )}

      {ultimo && (
        <section aria-labelledby="titulo-ultimo" className="space-y-3">
          <h2 id="titulo-ultimo" className="text-sm font-semibold text-texto-suave">
            Tu último viaje
          </h2>
          <Link href="/viajes" className="flex items-center gap-4 rounded-2xl bg-superficie p-4 text-texto">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-fondo text-secundario">
              <IconoViajes className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{ultimo.viaje.origen_texto}</span>
              <span className="block text-sm text-texto-suave">
                {fechaCorta(ultimo.viaje.terminado_en ?? ultimo.viaje.creado_en)}
                {ultimo.otraPersona ? ` · ${nombreCorto(ultimo.otraPersona)}` : ""}
              </span>
            </span>
            {ultimo.viaje.precio !== null && <span className="font-titulo font-semibold">{pesos(ultimo.viaje.precio)}</span>}
          </Link>
        </section>
      )}
    </main>
  );
}
