import type { Metadata } from "next";
import Link from "next/link";
import { retirarOferta } from "@/app/lib/acciones-viaje";
import { cupoActivoDelConductor } from "@/app/lib/consultas-cupo";
import { misDocumentos } from "@/app/lib/consultas-verificacion";
import { TIPOS_DOCUMENTO } from "@/app/lib/documentos";
import { resumenDelConductor, solicitudesAbiertas, vehiculoDe, viajeActivoDelConductor } from "@/app/lib/consultas-viaje";
import { calificacionTexto, etiquetaEstado, fechaCorta, hace, nombreCorto, pesos } from "@/app/lib/formato";
import { exigirRol } from "@/app/lib/sesion";
import { Aviso } from "@/app/ui/auth/campos";
import { BotonCambiarModo } from "@/app/ui/comun/boton-cambiar-modo";
import { EstadoCuenta } from "@/app/ui/comun/estado-cuenta";
import { EnVivo } from "@/app/ui/comun/en-vivo";
import { BotonAccion } from "@/app/ui/comun/boton-accion";
import { InterruptorDisponible } from "@/app/ui/conductor/interruptor-disponible";

export const metadata: Metadata = { title: "Inicio" };

// Inicio del conductor: disponibilidad, resumen y solicitudes a las que puede ofertar.
export default async function PaginaConductor({ searchParams }: { searchParams: Promise<{ clave?: string }> }) {
  const { usuario, perfil } = await exigirRol("conductor");
  const { clave } = await searchParams;
  const [vehiculo, activo, resumen, miCupo, documentos] = await Promise.all([
    vehiculoDe(usuario.id),
    viajeActivoDelConductor(usuario.id),
    resumenDelConductor(usuario.id),
    cupoActivoDelConductor(usuario.id),
    misDocumentos(usuario.id),
  ]);
  const aprobados = TIPOS_DOCUMENTO.filter((t) => documentos[t]?.estado === "aprobado").length;
  const rechazados = TIPOS_DOCUMENTO.filter((t) => documentos[t]?.estado === "rechazado").length;
  const verificado = aprobados === TIPOS_DOCUMENTO.length;
  // Sin disponibilidad, RLS no le muestra solicitudes: ni se piden.
  const abiertas = perfil.disponible && !activo ? await solicitudesAbiertas(usuario.id) : null;
  const solicitudes = abiertas?.solicitudes ?? [];
  const ahora = abiertas?.ahora ?? 0;

  return (
    <main className="space-y-6 px-5 pt-6">
      {/* Solicitudes nuevas, ofertas aceptadas o rechazadas llegan en tiempo real. */}
      {(perfil.disponible || activo || miCupo) && (
        <EnVivo
          escuchas={[
            { tabla: "viajes" },
            { tabla: "ofertas", filtro: `conductor_id=eq.${usuario.id}` },
            ...(miCupo ? [{ tabla: "puestos" as const, filtro: `cupo_id=eq.${miCupo.cupo.id}` }] : []),
          ]}
        />
      )}
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-texto-suave">Conductor</p>
          <h1 className="text-3xl tracking-tight">Hola, {perfil.nombre.split(" ")[0]}</h1>
        </div>
        <BotonCambiarModo modoActual="conductor" />
      </header>

      {clave === "actualizada" && <Aviso tipo="listo">Tu contraseña quedó actualizada.</Aviso>}
      <EstadoCuenta personaId={usuario.id} />

      {!verificado && (
        <section aria-labelledby="titulo-verificar" className="space-y-3 rounded-2xl border border-secundario/50 p-5">
          <h2 id="titulo-verificar" className="text-lg">
            {rechazados > 0 ? "Hay un documento por corregir" : "Verifica tu cuenta de conductor"}
          </h2>
          <p className="text-sm text-texto-suave">
            Sube tu cédula, licencia y tarjeta de propiedad. Llevas {aprobados} de 3 aprobados.
          </p>
          <Link
            href="/conductor/documentos"
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-primario font-titulo font-semibold text-texto hover:bg-primario/85"
          >
            {Object.keys(documentos).length === 0 ? "Subir mis documentos" : "Ver mis documentos"}
          </Link>
        </section>
      )}

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

      <section aria-labelledby="titulo-cupo" className="space-y-3 rounded-2xl bg-superficie p-5">
        <h2 id="titulo-cupo" className="text-lg">
          {miCupo ? (miCupo.cupo.estado === "en_curso" ? "Tu cupo va en camino" : "Tu cupo publicado") : "¿Vas a la U a una hora fija?"}
        </h2>
        {miCupo ? (
          <>
            <p className="text-sm text-texto-suave">
              Sale {fechaCorta(miCupo.cupo.sale_en)} · {miCupo.aprobados.length}/{miCupo.cupo.puestos} puestos
              {miCupo.pendientes.length > 0 && ` · ${miCupo.pendientes.length} por aprobar`}
            </p>
            <Link
              href="/conductor/cupo"
              className="flex h-14 w-full items-center justify-center rounded-xl bg-primario font-titulo font-semibold text-texto transition-colors hover:bg-primario/85"
            >
              {miCupo.pendientes.length > 0 ? "Revisar solicitudes" : "Ver mi cupo"}
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-texto-suave">Publica tu recorrido con hora de salida y deja que los estudiantes se suban en el camino.</p>
            <Link
              href="/conductor/cupo/nuevo"
              className="flex min-h-12 w-full items-center justify-center rounded-xl border border-texto-suave/30 font-semibold text-texto hover:bg-fondo"
            >
              Publicar un cupo
            </Link>
          </>
        )}
      </section>

      <InterruptorDisponible disponible={perfil.disponible} tieneVehiculo={!!vehiculo} verificado={verificado} />

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
