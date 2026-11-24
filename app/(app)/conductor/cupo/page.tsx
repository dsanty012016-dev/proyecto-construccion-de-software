import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cancelarCupo, iniciarCupo, responderPuesto, terminarCupo, voyParaLaU } from "@/app/lib/acciones-cupo";
import { EnlaceDeAyuda } from "@/app/ui/comun/ayuda-unigo";
import { reportarUbicacionCupo } from "@/app/lib/acciones-seguimiento";
import { gananciaConductor } from "@/app/lib/comision";
import { cupoActivoDelConductor, type SolicitudDePuesto } from "@/app/lib/consultas-cupo";
import { compartiendoUbicacion, distanciaATramoKm, ordenarRecogidas, puedeIrParaLaU } from "@/app/lib/cupo";
import { emergenciaDisponible } from "@/app/lib/emergencia";
import { calificacionTexto, fechaCorta, nombreCorto, pesos } from "@/app/lib/formato";
import { type Coordenada, distanciaTexto } from "@/app/lib/mapa";
import { exigirRol } from "@/app/lib/sesion";
import { Aviso } from "@/app/ui/auth/campos";
import { Avatar } from "@/app/ui/comun/avatar";
import { BotonAccion } from "@/app/ui/comun/boton-accion";
import { BotonEmergencia } from "@/app/ui/comun/boton-emergencia";
import { EncabezadoPantalla } from "@/app/ui/comun/encabezado-pantalla";
import { EnVivo } from "@/app/ui/comun/en-vivo";
import { IconoEstrella, IconoTelefono } from "@/app/ui/comun/iconos-app";
import { RutaViaje } from "@/app/ui/comun/ruta-viaje";
import { horaDe, venceCupo } from "@/app/lib/vencimientos";
import { RecorridoCupo } from "@/app/ui/conductor/recorrido-cupo";
import { TransmisorUbicacion } from "@/app/ui/conductor/transmisor-ubicacion";

export const metadata: Metadata = { title: "Tu cupo" };

/** Quién pidió puesto, dónde se sube (o se baja, en el regreso) y qué tan lejos queda del camino. */
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

function PuestoAprobado({ solicitud, salida, destino }: { solicitud: SolicitudDePuesto; salida: Coordenada; destino: Coordenada }) {
  const { pagado } = solicitud.puesto;
  return (
    <>
      <Persona solicitud={solicitud} salida={salida} destino={destino} />
      <p className={`text-sm font-semibold ${pagado > 0 ? "text-secundario" : "text-texto-suave"}`}>
        {pagado > 0 ? `Pagó ${pesos(pagado)}` : "Aún no ha pagado (tiene hasta 10 minutos antes de salir)"}
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
    </>
  );
}

// El cupo publicado del conductor: solicitudes por aprobar, estudiantes
// aprobados en orden de recogida o de bajada (con su teléfono) y los botones para salir,
// llegar o cancelar. Mientras va en camino, transmite su ubicación (014); en
// el regreso, también desde que avisa "Voy para la U" (036).
export default async function PaginaCupoConductor() {
  const { usuario } = await exigirRol("conductor");
  const datos = await cupoActivoDelConductor(usuario.id);
  if (!datos) redirect("/conductor");
  const { cupo, libres, pendientes, aprobados } = datos;
  const salida = { lat: cupo.salida_lat, lng: cupo.salida_lng };
  const destino = { lat: cupo.destino_lat, lng: cupo.destino_lng };
  const regreso = cupo.sentido === "regreso";
  // Orden (014): de la salida hacia el destino. En la ida es el orden de
  // recogida; en el regreso todos se suben en la U y es el orden de bajada.
  const enOrden = ordenarRecogidas(
    salida,
    destino,
    aprobados.map((s) => ({ ...s, recogida: { lat: s.puesto.recogida_lat, lng: s.puesto.recogida_lng } })),
  );
  const confirmadas = enOrden.filter(({ puesto }) => puesto.pagado > 0).map((solicitud) => ({
    id: solicitud.puesto.id,
    punto: solicitud.recogida,
    lugar: solicitud.puesto.recogida_texto,
    detalle: <PuestoAprobado solicitud={solicitud} salida={salida} destino={destino} />,
  }));
  const sinPagar = enOrden.filter(({ puesto }) => puesto.pagado === 0);
  const otrasParadas = sinPagar.length > 0
    ? sinPagar.map((s) => s.recogida)
    : pendientes.map(({ puesto }) => ({ lat: puesto.recogida_lat, lng: puesto.recogida_lng }));
  const publicado = cupo.estado === "publicado";
  const hayPagos = confirmadas.length > 0;
  const compartiendo = compartiendoUbicacion(cupo);

  return (
    <main className="space-y-5 px-5 pt-6">
      <EnVivo escuchas={[{ tabla: "cupos", filtro: `id=eq.${cupo.id}` }, { tabla: "puestos", filtro: `cupo_id=eq.${cupo.id}` }]} />
      <EncabezadoPantalla titulo={publicado ? "Tu cupo" : "Cupo en camino"} volverA="/conductor" />
      {emergenciaDisponible({ tipo: "cupo", estado: cupo.estado, soyConductor: true, pagado: false }) && <BotonEmergencia cupo={cupo.id} />}

      <section aria-label="Datos del cupo" className="space-y-4 rounded-2xl bg-superficie p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-titulo text-lg font-bold">Sale {fechaCorta(cupo.sale_en)}</p>
          <p className="text-sm text-texto-suave">
            {aprobados.length}/{cupo.puestos} {cupo.puestos === 1 ? "puesto" : "puestos"}
          </p>
        </div>
        <RutaViaje origen={cupo.salida_texto} destino={cupo.destino_texto} etiquetaOrigen="Sales de" etiquetaDestino={regreso ? "Vas hasta" : "Vas a"} />
        <p className="text-sm text-texto-suave">
          {pesos(cupo.precio)} por puesto · recibes {pesos(gananciaConductor(cupo.precio))} por cada estudiante que pague, al llegar
        </p>
      </section>

      <RecorridoCupo
        key={JSON.stringify([cupo.id, salida, destino, confirmadas.map(({ id, punto }) => [id, punto])])}
        cupoId={cupo.id}
        salida={salida}
        destino={destino}
        regreso={regreso}
        publicado={publicado}
        confirmadas={confirmadas}
        otrasParadas={otrasParadas}
        seguimiento={compartiendo && <TransmisorUbicacion enviar={reportarUbicacionCupo.bind(null, cupo.id)} clave={cupo.id} quienVe="Tus estudiantes" />}
        rumbo={
          puedeIrParaLaU(cupo, hayPagos) ? (
            <BotonAccion
              accion={voyParaLaU}
              campos={{ cupo: cupo.id }}
              estilo="borde"
              enviando="Avisando…"
              textoSi="Sí, voy"
              confirmar="¿Vas para la U? Los estudiantes que pagaron empiezan a verte llegar en el mapa."
            >
              Voy para la U
            </BotonAccion>
          ) : publicado && compartiendo ? (
            <Aviso tipo="listo">Vas para la U: quienes pagaron te ven llegar. Cuando todos estén en el carro, toca «Salir ahora».</Aviso>
          ) : null
        }
        solicitudes={publicado && (
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
        porPagar={sinPagar.length > 0 && (
          <>
            <h3 className="text-base">Puestos aprobados pendientes de pago</h3>
            <ul className="space-y-3">
              {sinPagar.map((solicitud) => (
                <li key={solicitud.puesto.id} className="space-y-3 rounded-2xl bg-superficie p-4">
                  <PuestoAprobado solicitud={solicitud} salida={salida} destino={destino} />
                </li>
              ))}
            </ul>
          </>
        )}
      />

      <EnlaceDeAyuda motivo={{ tipo: "cupo", referencia: cupo.id }} />

      {publicado ? (
        <>
          <p className="text-center text-[13px] text-texto-suave">
            Si no sales antes de las {horaDe(venceCupo(Date.parse(cupo.sale_en)))}, el cupo se cancela solo: a quien pagó se le devuelve todo
            {hayPagos ? " y sumas una falta" : ""}.
          </p>
          <BotonAccion accion={iniciarCupo} campos={{ cupo: cupo.id }} enviando="Saliendo…" textoSi="Sí, salir" confirmar="¿Sales ahora? Solo van quienes pagaron; los que no, pierden el puesto y las solicitudes pendientes quedan rechazadas.">
            Salir ahora · Iniciar cupo
          </BotonAccion>
          <BotonAccion accion={cancelarCupo} campos={{ cupo: cupo.id }} estilo="peligro" textoSi="Sí, cancelar" confirmar={
              hayPagos
                ? "¿Cancelar el cupo? Los estudiantes recuperan todo su dinero y tú sumas una falta."
                : "¿Cancelar el cupo? Se cancelarán todas las solicitudes."
            }>
            Cancelar cupo
          </BotonAccion>
        </>
      ) : (
        <BotonAccion accion={terminarCupo} campos={{ cupo: cupo.id }} enviando="Terminando…" textoSi="Sí, llegamos" confirmar={regreso ? "¿Terminaste el recorrido?" : "¿Llegaron a la universidad?"}>
          Llegamos · Terminar cupo
        </BotonAccion>
      )}
    </main>
  );
}
