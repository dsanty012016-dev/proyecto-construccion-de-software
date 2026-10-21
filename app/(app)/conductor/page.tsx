import type { Metadata } from "next";
import Link from "next/link";
import { retirarOferta } from "@/app/lib/acciones-viaje";
import { resumenDelConductor, solicitudesAbiertas, vehiculoDe, viajeActivoDelConductor } from "@/app/lib/consultas-viaje";
import { calificacionTexto, etiquetaEstado, hace, nombreCorto, pesos } from "@/app/lib/formato";
import { exigirRol } from "@/app/lib/sesion";
import { Aviso } from "@/app/ui/auth/campos";
import { BotonCambiarModo } from "@/app/ui/comun/boton-cambiar-modo";
import { EnVivo } from "@/app/ui/comun/en-vivo";
import { BotonAccion } from "@/app/ui/comun/boton-accion";
import { InterruptorDisponible } from "@/app/ui/conductor/interruptor-disponible";

export const metadata: Metadata = { title: "Inicio" };

// Inicio del conductor: disponibilidad, resumen y solicitudes a las que puede ofertar.
export default async function PaginaConductor({ searchParams }: { searchParams: Promise<{ clave?: string }> }) {
  const { usuario, perfil } = await exigirRol("conductor");
  const { clave } = await searchParams;
  const [vehiculo, activo, resumen] = await Promise.all([
    vehiculoDe(usuario.id),
    viajeActivoDelConductor(usuario.id),
    resumenDelConductor(usuario.id),
  ]);
  // Sin disponibilidad, RLS no le muestra solicitudes: ni se piden.
  const abiertas = perfil.disponible && !activo ? await solicitudesAbiertas(usuario.id) : null;
  const solicitudes = abiertas?.solicitudes ?? [];
  const ahora = abiertas?.ahora ?? 0;

  return (
    <main className="space-y-6 px-5 pt-6">
      {/* Solicitudes nuevas, ofertas aceptadas o rechazadas llegan en tiempo real. */}
      {(perfil.disponible || activo) && (
        <EnVivo escuchas={[{ tabla: "viajes" }, { tabla: "ofertas", filtro: `conductor_id=eq.${usuario.id}` }]} />
      )}
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-texto-suave">Conductor</p>
          <h1 className="text-3xl tracking-tight">Hola, {perfil.nombre.split(" ")[0]}</h1>
        </div>
        <BotonCambiarModo modoActual="conductor" />
      </header>

      {clave === "actualizada" && <Aviso tipo="listo">Tu contraseña quedó actualizada.</Aviso>}

      {activo && (
        <section aria-labelledby="titulo-viaje-activo" className="space-y-3 rounded-2xl border border-secundario/50 p-5">
          <h2 id="titulo-viaje-activo" className="text-lg">
            {etiquetaEstado(activo.viaje.estado)}
          </h2>
          <p className="text-sm text-texto-suave">
            {activo.estudiante ? `Estudiante: ${nombreCorto(activo.estudiante.nombre)}` : "Tienes un viaje asignado."}
          </p>
          <Link
            href="/conductor/viaje"
            className="flex h-14 w-full items-center justify-center rounded-xl bg-primario font-titulo font-semibold text-texto transition-colors hover:bg-primario/85"
          >
            Ver mi viaje
          </Link>
        </section>
      )}

      <InterruptorDisponible disponible={perfil.disponible} tieneVehiculo={!!vehiculo} />

      {!vehiculo && (
        <Link
          href="/conductor/vehiculo"
          className="flex min-h-12 w-full items-center justify-center rounded-xl border border-texto-suave/30 font-semibold text-texto hover:bg-superficie"
        >
          Registrar mi vehículo
        </Link>
      )}

      <section aria-label="Resumen" className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-superficie p-4">
          <p className="font-titulo text-2xl font-bold">{resumen.viajesEstaSemana}</p>
          <p className="text-sm text-texto-suave">viajes esta semana</p>
        </div>
        <div className="rounded-2xl bg-superficie p-4">
          <p className="font-titulo text-2xl font-bold">
            {resumen.totalCalificaciones > 0 ? `★ ${calificacionTexto(resumen.calificacion)}` : "Nuevo"}
          </p>
          <p className="text-sm text-texto-suave">calificación</p>
        </div>
      </section>

      <section aria-labelledby="titulo-solicitudes" className="space-y-3">
        <h2 id="titulo-solicitudes" className="text-lg">
          Solicitudes de viaje
        </h2>
        {activo ? (
          <p className="text-sm text-texto-suave">Termina tu viaje actual para ver nuevas solicitudes.</p>
        ) : !perfil.disponible ? (
          <p className="text-sm text-texto-suave">Ponte disponible para ver las solicitudes de los estudiantes.</p>
        ) : solicitudes.length === 0 ? (
          <p role="status" className="rounded-2xl border border-texto-suave/25 p-5 text-center text-texto-suave">
            No hay solicitudes por ahora. Las nuevas aparecen aquí sin recargar.
          </p>
        ) : (
          <ul className="space-y-3">
            {solicitudes.map(({ viaje, estudiante, miOferta }) => (
              <li key={viaje.id} className="space-y-3 rounded-2xl bg-superficie p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate font-bold">{estudiante ? nombreCorto(estudiante.nombre) : "Estudiante"}</p>
                  <p className="shrink-0 text-xs text-texto-suave">hace {hace(Date.parse(viaje.creado_en), ahora)}</p>
                </div>
                <p className="text-sm text-texto-suave">
                  {viaje.origen_texto} → {viaje.destino_texto}
                </p>
                {miOferta ? (
                  <div className="space-y-2">
                    <p className="text-sm">
                      Tu oferta: <span className="font-titulo font-bold">{pesos(miOferta.precio)}</span> · esperando respuesta
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href={`/conductor/ofertar/${viaje.id}`}
                        className="flex min-h-12 items-center justify-center rounded-xl border border-texto-suave/30 font-semibold text-texto hover:bg-fondo"
                      >
                        Cambiar precio
                      </Link>
                      <BotonAccion accion={retirarOferta} campos={{ viaje: viaje.id }} estilo="peligro" enviando="Retirando…">
                        Retirar
                      </BotonAccion>
                    </div>
                  </div>
                ) : (
                  <Link
                    href={`/conductor/ofertar/${viaje.id}`}
                    className="flex min-h-12 w-full items-center justify-center rounded-xl bg-primario font-titulo font-semibold text-texto transition-colors hover:bg-primario/85"
                  >
                    Ofertar
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
