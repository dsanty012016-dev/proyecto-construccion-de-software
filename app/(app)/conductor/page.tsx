import type { Metadata } from "next";
import Link from "next/link";
import { retirarOferta } from "@/app/lib/acciones-viaje";
import { cupoActivoDelConductor } from "@/app/lib/consultas-cupo";
import { misDocumentos } from "@/app/lib/consultas-verificacion";
import { TIPOS_DOCUMENTO } from "@/app/lib/documentos";
import { resumenDelConductor, solicitudesAbiertas, vehiculoDe, viajeActivoDelConductor } from "@/app/lib/consultas-viaje";
import { calificacionTexto, etiquetaEstado, hace, horaCorta, nombreCorto, pesos } from "@/app/lib/formato";
import { estadoDeCuenta, miSaldo } from "@/app/lib/consultas-billetera";
import { exigirRol } from "@/app/lib/sesion";
import { Aviso } from "@/app/ui/auth/campos";
import { BotonAccion } from "@/app/ui/comun/boton-accion";
import { BotonCambiarModo } from "@/app/ui/comun/boton-cambiar-modo";
import { EnVivo } from "@/app/ui/comun/en-vivo";
import { EstadoCuenta } from "@/app/ui/comun/estado-cuenta";
import { IconoSiguiente } from "@/app/ui/comun/iconos-app";
import { PastillaSaldo } from "@/app/ui/comun/pastilla-saldo";
import { InterruptorDisponible } from "@/app/ui/conductor/interruptor-disponible";

export const metadata: Metadata = { title: "Inicio" };

const FILA_ENLACE = "flex min-h-14 items-center gap-3 rounded-2xl border border-texto-suave/25 px-4 py-2 text-texto hover:bg-superficie";

// Inicio del conductor (rediseño): el interruptor de disponibilidad manda;
// debajo, lo pendiente (verificación, viaje, cupo) en filas y la cola de
// solicitudes a las que puede ofertar.
export default async function PaginaConductor({ searchParams }: { searchParams: Promise<{ clave?: string }> }) {
  const { usuario, perfil } = await exigirRol("conductor");
  const { clave } = await searchParams;
  // Saldo y strikes arrancan ya; la pastilla y el aviso los reciben listos (cache).
  void miSaldo(usuario.id);
  void estadoDeCuenta(usuario.id);
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
  const lineaResumen = `Esta semana: ${resumen.viajesEstaSemana} ${resumen.viajesEstaSemana === 1 ? "viaje" : "viajes"} · ${
    resumen.totalCalificaciones > 0 ? `★ ${calificacionTexto(resumen.calificacion)}` : "aún sin calificación"
  }`;

  return (
    <main className="space-y-3 px-5 pt-4">
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
      <header className="flex items-center justify-between gap-3 pb-2">
        <h1 className="sr-only">Inicio del conductor, {perfil.nombre.split(" ")[0]}</h1>
        <BotonCambiarModo modoActual="conductor" />
        <PastillaSaldo personaId={usuario.id} />
      </header>

      {clave === "actualizada" && <Aviso tipo="listo">Tu contraseña quedó actualizada.</Aviso>}
      <EstadoCuenta personaId={usuario.id} />

      {!verificado && (
        <Link href="/conductor/documentos" className={FILA_ENLACE}>
          <span className="font-titulo text-lg font-bold tabular-nums">{aprobados}/3</span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">{rechazados > 0 ? "Hay un documento por corregir" : "Verifica tu cuenta"}</span>
            <span className="block text-[13px] text-texto-suave">
              {Object.keys(documentos).length === 0 ? "Sube cédula, licencia y tarjeta de propiedad" : "Documentos aprobados"}
            </span>
          </span>
          <IconoSiguiente className="size-5 text-texto-suave" />
        </Link>
      )}

      {!vehiculo && (
        <Link href="/conductor/vehiculo" className={FILA_ENLACE}>
          <span className="min-w-0 flex-1 font-bold">Registra tu vehículo</span>
          <IconoSiguiente className="size-5 text-texto-suave" />
        </Link>
      )}

      {activo ? (
        <section aria-labelledby="titulo-viaje-activo" className="space-y-3 rounded-[18px] bg-primario p-[18px] text-texto">
          <h2 id="titulo-viaje-activo" className="text-[22px] tracking-tight">
            {etiquetaEstado(activo.viaje.estado)}
          </h2>
          <p className="text-sm">{activo.estudiante ? `Llevas a ${nombreCorto(activo.estudiante.nombre)} · ${activo.viaje.origen_texto}` : "Tienes un viaje asignado."}</p>
          <Link
            href="/conductor/viaje"
            className="flex h-12 w-full items-center justify-center rounded-xl bg-texto font-titulo font-semibold text-fondo hover:bg-texto/90"
          >
            Ver mi viaje
          </Link>
        </section>
      ) : (
        <InterruptorDisponible disponible={perfil.disponible} tieneVehiculo={!!vehiculo} verificado={verificado} resumen={lineaResumen} />
      )}

      {miCupo ? (
        <Link href="/conductor/cupo" className={FILA_ENLACE}>
          <span className="font-titulo text-lg font-bold tabular-nums">{horaCorta(miCupo.cupo.sale_en).hora}</span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">{miCupo.cupo.estado === "en_curso" ? "Tu cupo va en camino" : "Tu cupo publicado"}</span>
            <span className="block text-[13px] text-texto-suave">
              {miCupo.aprobados.length} de {miCupo.cupo.puestos} puestos
              {miCupo.pendientes.length > 0 &&
                ` · ${miCupo.pendientes.length} ${miCupo.pendientes.length === 1 ? "solicitud" : "solicitudes"} por aprobar`}
            </span>
          </span>
          <IconoSiguiente className="size-5 text-texto-suave" />
        </Link>
      ) : (
        verificado && (
          <Link href="/conductor/cupo/nuevo" className={FILA_ENLACE}>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">¿Vas a la U a una hora fija?</span>
              <span className="block text-[13px] text-texto-suave">Publica un cupo y que se suban en el camino</span>
            </span>
            <IconoSiguiente className="size-5 text-texto-suave" />
          </Link>
        )
      )}

      <section aria-labelledby="titulo-solicitudes" className="pt-4">
        <h2 id="titulo-solicitudes" className="flex items-baseline gap-2 text-lg">
          Solicitudes
          {perfil.disponible && !activo && <span className="font-texto text-[13px] font-semibold text-texto-suave">llegan en vivo</span>}
        </h2>
        {activo ? (
          <p className="mt-2 text-sm text-texto-suave">Termina tu viaje actual para ver nuevas solicitudes.</p>
        ) : !perfil.disponible ? (
          <p className="mt-2 text-sm text-texto-suave">Ponte disponible para ver las solicitudes de los estudiantes.</p>
        ) : solicitudes.length === 0 ? (
          <p role="status" className="mt-2 text-sm text-texto-suave">
            No hay solicitudes por ahora. Las nuevas aparecen aquí sin recargar.
          </p>
        ) : (
          <ul className="mt-1">
            {solicitudes.map(({ viaje, estudiante, miOferta }) => (
              <li key={viaje.id} className="flex items-center gap-3 border-b border-texto-suave/15 py-3.5 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {estudiante ? nombreCorto(estudiante.nombre) : "Estudiante"}{" "}
                    <span className="text-[13px] font-medium text-texto-suave">· hace {hace(Date.parse(viaje.creado_en), ahora)}</span>
                  </p>
                  {miOferta ? (
                    <p className="text-[13px] text-secundario tabular-nums">Ofertaste {pesos(miOferta.precio)} · esperando</p>
                  ) : (
                    <p className="truncate text-[13px] text-texto-suave">{viaje.origen_texto} → U</p>
                  )}
                </div>
                {miOferta ? (
                  <div className="flex shrink-0 gap-2">
                    <Link
                      href={`/conductor/ofertar/${viaje.id}`}
                      className="flex min-h-11 items-center rounded-xl border border-texto-suave/30 px-3.5 text-sm font-semibold text-texto hover:bg-superficie"
                    >
                      Cambiar
                    </Link>
                    <BotonAccion
                      accion={retirarOferta}
                      campos={{ viaje: viaje.id }}
                      estilo="pequenoBorde"
                      enviando="…"
                      etiqueta={`Retirar tu oferta a ${estudiante ? nombreCorto(estudiante.nombre) : "el estudiante"}`}
                    >
                      Retirar
                    </BotonAccion>
                  </div>
                ) : (
                  <Link
                    href={`/conductor/ofertar/${viaje.id}`}
                    className="flex min-h-11 shrink-0 items-center rounded-xl bg-primario px-[18px] font-titulo text-[15px] font-semibold text-texto hover:bg-primario/85"
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
