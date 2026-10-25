import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cancelarCupo, iniciarCupo, responderPuesto, terminarCupo } from "@/app/lib/acciones-cupo";
import { gananciaConductor } from "@/app/lib/comision";
import { cupoActivoDelConductor, type SolicitudDePuesto } from "@/app/lib/consultas-cupo";
import { distanciaATramoKm } from "@/app/lib/cupo";
import { calificacionTexto, fechaCorta, nombreCorto, pesos } from "@/app/lib/formato";
import { type Coordenada, distanciaTexto } from "@/app/lib/mapa";
import { exigirRol } from "@/app/lib/sesion";
import { Avatar } from "@/app/ui/comun/avatar";
import { BotonAccion } from "@/app/ui/comun/boton-accion";
import { EncabezadoPantalla } from "@/app/ui/comun/encabezado-pantalla";
import { EnVivo } from "@/app/ui/comun/en-vivo";
import { IconoEstrella, IconoTelefono } from "@/app/ui/comun/iconos-app";
import { Mapa } from "@/app/ui/comun/mapa";
import { RutaViaje } from "@/app/ui/comun/ruta-viaje";

export const metadata: Metadata = { title: "Tu cupo" };

/** Quién pidió puesto, dónde se sube y qué tan lejos queda del camino. */
function Persona({ solicitud, salida, destino }: { solicitud: SolicitudDePuesto; salida: Coordenada; destino: Coordenada }) {
  const { puesto, estudiante } = solicitud;
  const desvio = distanciaATramoKm({ lat: puesto.recogida_lat, lng: puesto.recogida_lng }, salida, destino);
  return (
    <div className="flex items-start gap-3">
      <Avatar nombre={estudiante?.nombre ?? "Estudiante"} sobreTarjeta />
      <div className="min-w-0 flex-1">
        <p className="font-bold">{estudiante ? nombreCorto(estudiante.nombre) : "Estudiante"}</p>
        {estudiante && (
          <p className="flex items-center gap-1 text-sm text-texto-suave">
            <IconoEstrella llena className="size-4 text-secundario" />
            {estudiante.total_calificaciones > 0 ? calificacionTexto(estudiante.calificacion) : "Nuevo"}
          </p>
        )}
        <p className="mt-1 text-sm break-words">{puesto.recogida_texto}</p>
        <p className="text-xs text-texto-suave">A unos {distanciaTexto(desvio)} de tu camino (en línea recta).</p>
      </div>
    </div>
  );
}

// El cupo publicado del conductor: solicitudes por aprobar, estudiantes
// aprobados (con su teléfono) y los botones para salir, llegar o cancelar.
export default async function PaginaCupoConductor() {
  const { usuario } = await exigirRol("conductor");
  const datos = await cupoActivoDelConductor(usuario.id);
  if (!datos) redirect("/conductor");
  const { cupo, libres, pendientes, aprobados } = datos;
  const salida = { lat: cupo.salida_lat, lng: cupo.salida_lng };
  const destino = { lat: cupo.destino_lat, lng: cupo.destino_lng };
  const paradas = [...aprobados, ...pendientes].map((s) => ({ lat: s.puesto.recogida_lat, lng: s.puesto.recogida_lng }));
  const publicado = cupo.estado === "publicado";
  const hayPagos = aprobados.some((s) => s.puesto.pagado > 0);

  return (
    <main className="space-y-5 px-5 pt-6">
      <EnVivo escuchas={[{ tabla: "cupos", filtro: `id=eq.${cupo.id}` }, { tabla: "puestos", filtro: `cupo_id=eq.${cupo.id}` }]} />
      <EncabezadoPantalla titulo={publicado ? "Tu cupo" : "Cupo en camino"} volverA="/conductor" />

      <section aria-label="Datos del cupo" className="space-y-4 rounded-2xl bg-superficie p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-titulo text-lg font-bold">Sale {fechaCorta(cupo.sale_en)}</p>
          <p className="text-sm text-texto-suave">
            {aprobados.length}/{cupo.puestos} {cupo.puestos === 1 ? "puesto" : "puestos"}
          </p>
        </div>
        <RutaViaje origen={cupo.salida_texto} destino={cupo.destino_texto} etiquetaOrigen="Sales de" />
        <p className="text-sm text-texto-suave">
          {pesos(cupo.precio)} por puesto · recibes {pesos(gananciaConductor(cupo.precio))} por cada estudiante que pague, al llegar
        </p>
      </section>

      <Mapa etiqueta="Mapa del cupo con las recogidas" centro={salida} origen={salida} destino={destino} paradas={paradas} className="h-56" />

      {publicado && (
        <section aria-labelledby="titulo-pendientes" className="space-y-3">
          <h2 id="titulo-pendientes" className="text-lg">
            Solicitudes {pendientes.length > 0 && `(${pendientes.length})`}
          </h2>
          {pendientes.length === 0 ? (
            <p role="status" className="rounded-2xl border border-texto-suave/25 p-5 text-center text-sm text-texto-suave">
              {libres === 0 ? "Ya llenaste tus puestos." : "Aún no hay solicitudes. Aparecen aquí sin recargar."}
            </p>
          ) : (
            <ul className="space-y-3">
              {pendientes.map((solicitud) => (
                <li key={solicitud.puesto.id} className="space-y-3 rounded-2xl bg-superficie p-4">
                  <Persona solicitud={solicitud} salida={salida} destino={destino} />
                  <div className="grid grid-cols-2 gap-2">
                    <BotonAccion accion={responderPuesto} campos={{ puesto: solicitud.puesto.id, decision: "rechazar" }} estilo="pequenoBorde" enviando="…">
                      Rechazar
                    </BotonAccion>
                    <BotonAccion accion={responderPuesto} campos={{ puesto: solicitud.puesto.id, decision: "aprobar" }} estilo="pequeno" enviando="Aprobando…">
                      Aprobar
                    </BotonAccion>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section aria-labelledby="titulo-aprobados" className="space-y-3">
        <h2 id="titulo-aprobados" className="text-lg">
          Van contigo
        </h2>
        {aprobados.length === 0 ? (
          <p className="text-sm text-texto-suave">Todavía no has aprobado a nadie.</p>
        ) : (
          <ul className="space-y-3">
            {aprobados.map((solicitud) => (
              <li key={solicitud.puesto.id} className="space-y-3 rounded-2xl bg-superficie p-4">
                <Persona solicitud={solicitud} salida={salida} destino={destino} />
                <p className={`text-sm font-semibold ${solicitud.puesto.pagado > 0 ? "text-secundario" : "text-texto-suave"}`}>
                  {solicitud.puesto.pagado > 0 ? `Pagó ${pesos(solicitud.puesto.pagado)}` : "Aún no ha pagado (tiene hasta 10 minutos antes de salir)"}
                </p>
                {solicitud.telefono && (
                  <a
                    href={`tel:${solicitud.telefono}`}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-texto-suave/30 text-sm font-semibold text-texto hover:bg-fondo"
                  >
                    <IconoTelefono className="size-4" />
                    Llamar
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {publicado ? (
        <>
          <BotonAccion accion={iniciarCupo} campos={{ cupo: cupo.id }} enviando="Saliendo…" confirmar="¿Sales ahora? Solo van quienes pagaron; los que no, pierden el puesto y las solicitudes pendientes quedan rechazadas.">
            Salir ahora · Iniciar cupo
          </BotonAccion>
          <BotonAccion accion={cancelarCupo} campos={{ cupo: cupo.id }} estilo="peligro" confirmar={
              hayPagos
                ? "¿Cancelar el cupo? Los estudiantes recuperan todo su dinero y tú sumas 1 strike."
                : "¿Cancelar el cupo? Se cancelarán todas las solicitudes."
            }>
            Cancelar cupo
          </BotonAccion>
        </>
      ) : (
        <BotonAccion accion={terminarCupo} campos={{ cupo: cupo.id }} enviando="Terminando…" confirmar="¿Llegaron a la universidad?">
          Llegamos · Terminar cupo
        </BotonAccion>
      )}
    </main>
  );
}
