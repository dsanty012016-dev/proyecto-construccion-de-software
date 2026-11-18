import type { Metadata } from "next";
import Link from "next/link";
import { miSaldo } from "@/app/lib/consultas-billetera";
import { enlaceParaRecargar } from "@/app/lib/retorno-recarga";
import { redirect } from "next/navigation";
import { pagarPuesto, retirarPuesto } from "@/app/lib/acciones-cupo";
import { compartirPuesto } from "@/app/lib/acciones-seguimiento";
import { cupoParaEstudiante } from "@/app/lib/consultas-cupo";
import { ubicacionDelCupoConHora } from "@/app/lib/consultas-seguimiento";
import { etiquetaPuesto } from "@/app/lib/cupo";
import { calificacionTexto, fechaCorta, nombreCorto, pesos } from "@/app/lib/formato";
import { limiteDePago, puedePagarPuesto, salidaDeCupo } from "@/app/lib/pagos";
import { exigirRol } from "@/app/lib/sesion";
import { Aviso } from "@/app/ui/auth/campos";
import { Avatar } from "@/app/ui/comun/avatar";
import { BotonAccion } from "@/app/ui/comun/boton-accion";
import { EncabezadoPantalla } from "@/app/ui/comun/encabezado-pantalla";
import { EnVivo } from "@/app/ui/comun/en-vivo";
import { IconoEstrella, IconoTelefono } from "@/app/ui/comun/iconos-app";
import { Mapa } from "@/app/ui/comun/mapa";
import { RutaViaje } from "@/app/ui/comun/ruta-viaje";
import { BotonCompartirViaje } from "@/app/ui/estudiante/boton-compartir-viaje";
import { EnlaceDeAyuda } from "@/app/ui/comun/ayuda-unigo";
import { FormularioPuesto } from "@/app/ui/estudiante/formulario-puesto";
import { MapaEnVivo } from "@/app/ui/estudiante/mapa-en-vivo";
import { horaDe, venceCupo } from "@/app/lib/vencimientos";
import { Placa } from "@/app/ui/comun/placa";

export const metadata: Metadata = { title: "Cupo" };

export default async function PaginaCupo({ params }: { params: Promise<{ id: string }> }) {
  const { usuario } = await exigirRol("estudiante");
  const { id } = await params;
  const [datos, saldo] = await Promise.all([cupoParaEstudiante(id, usuario.id), miSaldo(usuario.id)]);
  if (!datos) redirect("/estudiante/cupos");
  const { cupo, conductor, vehiculo, libres, miPuesto, telefonoConductor, ahora } = datos;
  const saleMs = Date.parse(cupo.sale_en);
  const salida = { lat: cupo.salida_lat, lng: cupo.salida_lng };
  const destino = { lat: cupo.destino_lat, lng: cupo.destino_lng };
  const activo = cupo.estado === "publicado" || cupo.estado === "en_curso";
  const tengoPuesto = miPuesto?.estado === "pendiente" || miPuesto?.estado === "aprobado";
  const aprobado = miPuesto?.estado === "aprobado";
  const puedePedir = cupo.estado === "publicado" && libres > 0 && !tengoPuesto && miPuesto?.estado !== "rechazado" && miPuesto?.estado !== "sin_pago";
  const nombre = conductor ? nombreCorto(conductor.nombre) : "el conductor";
  const pagado = aprobado && (miPuesto?.pagado ?? 0) > 0;
  const regreso = cupo.sentido === "regreso";
  // Mi punto: donde me recogen (ida) o donde me bajo (regreso).
  const miRecogida = miPuesto ? { lat: miPuesto.recogida_lat, lng: miPuesto.recogida_lng } : salida;
  // Con el cupo en camino y el puesto pagado, la ubicación del conductor (014).
  const enVivo = cupo.estado === "en_curso" && pagado ? await ubicacionDelCupoConHora(cupo.id) : null;

  return (
    <main className="space-y-5 px-5 pt-6">
      <EnVivo escuchas={[{ tabla: "cupos", filtro: `id=eq.${cupo.id}` }, { tabla: "puestos", filtro: `cupo_id=eq.${cupo.id}` }]} />
      <EncabezadoPantalla titulo={`Cupo de ${nombre}`} volverA="/estudiante/cupos" />

      <section aria-label="Datos del cupo" className="space-y-4 rounded-2xl bg-superficie p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="font-titulo text-lg font-bold">Sale {fechaCorta(cupo.sale_en)}</p>
          <p className="font-titulo text-lg font-bold">{pesos(cupo.precio)}</p>
        </div>
        <RutaViaje origen={cupo.salida_texto} destino={cupo.destino_texto} etiquetaOrigen="Sale de" etiquetaDestino={regreso ? "Va hasta" : "Vas a"} />
        <div className="flex flex-wrap items-center gap-3 border-t border-texto-suave/20 pt-4">
          <Avatar nombre={conductor?.nombre ?? "Conductor"} sobreTarjeta />
          <div className="min-w-0 flex-1 basis-40">
            <p className="font-bold">{conductor ? nombreCorto(conductor.nombre) : "Conductor"}</p>
            <p className="flex flex-wrap items-center gap-1 text-sm text-texto-suave [overflow-wrap:anywhere]">
              <IconoEstrella llena className="size-4 shrink-0 text-secundario" />
              {conductor && conductor.total_calificaciones > 0 ? calificacionTexto(conductor.calificacion) : "Nuevo"}
              {vehiculo && ` · ${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.color}`}
            </p>
          </div>
          {aprobado && vehiculo && (
            <Placa placa={vehiculo.placa} />
          )}
        </div>
        {cupo.estado === "publicado" && (
          <p className={`text-sm font-semibold ${libres > 0 ? "text-secundario" : "text-texto-suave"}`}>
            {libres > 0 ? `${libres} ${libres === 1 ? "puesto libre" : "puestos libres"}` : "Este cupo está lleno."}
          </p>
        )}
      </section>

      {tengoPuesto && activo && miPuesto ? (
        <section aria-labelledby="titulo-mi-puesto" className="space-y-4 rounded-2xl border border-secundario/50 p-4">
          <h2 id="titulo-mi-puesto" className="text-lg">
            {cupo.estado === "en_curso" ? "El conductor ya salió" : etiquetaPuesto(miPuesto.estado)}
          </h2>
          <p className="text-sm">
            {regreso ? `Te subes en ${cupo.salida_texto} y te bajas en ${miPuesto.recogida_texto}` : `Te subes en: ${miPuesto.recogida_texto}`}
          </p>
          {enVivo ? (
            // El conductor ya salió: se ve moverse en vivo (014). Solo tu recogida en el mapa.
            <div className="-mx-4 overflow-hidden">
              <MapaEnVivo
                fuente={{ tabla: "ubicaciones_cupo", columna: "cupo_id", id: cupo.id }}
                origen={salida}
                destino={destino}
                paradas={[miRecogida]}
                inicial={enVivo.ubicacion ? { lat: enVivo.ubicacion.lat, lng: enVivo.ubicacion.lng, actualizado_en: enVivo.ubicacion.actualizado_en } : null}
                ahoraInicial={enVivo.ahora}
                uEnElOrigen={regreso}
                className="h-64"
              />
            </div>
          ) : (
            <Mapa
              etiqueta={regreso ? "Mapa del cupo con el punto donde te bajas" : "Mapa del cupo con tu punto de recogida"}
              centro={salida}
              origen={salida}
              destino={destino}
              paradas={[miRecogida]}
              uEnElOrigen={regreso}
              className="h-52"
            />
          )}
          {aprobado && miPuesto.pagado > 0 && <Aviso tipo="listo">Puesto pagado: {pesos(miPuesto.pagado)}.</Aviso>}
          {aprobado && miPuesto.pagado === 0 && cupo.estado === "publicado" && (
            puedePagarPuesto(saleMs, ahora) ? (
              <div className="space-y-2">
                <p className="text-sm">Tu saldo: <strong className="tabular-nums">{pesos(saldo)}</strong>.{saldo < cupo.precio && <> Te faltan <strong className="tabular-nums">{pesos(cupo.precio - saldo)}</strong>.</>}</p>
                {saldo >= cupo.precio ? <BotonAccion accion={pagarPuesto} campos={{ cupo: cupo.id }} enviando="Pagando…">
                  Pagar mi puesto · {pesos(cupo.precio)}
                </BotonAccion> : <Link href={enlaceParaRecargar(`/estudiante/cupos/${cupo.id}`)} className="flex min-h-14 w-full items-center justify-center rounded-xl bg-primario px-4 py-3 text-center prensa font-semibold text-sobre-primario">Recargar para este puesto</Link>}
                <p className="text-center text-sm text-texto-suave">
                  Paga a más tardar el {fechaCorta(new Date(limiteDePago(saleMs)).toISOString())} o pierdes el puesto.
                </p>
              </div>
            ) : (
              <Aviso tipo="error">Ya pasó el límite para pagar (10 minutos antes de la salida).</Aviso>
            )
          )}
          {pagado && cupo.estado === "publicado" && (
            <p className="text-[13px] text-texto-suave">
              Si el conductor no sale antes de las {horaDe(venceCupo(saleMs))}, el cupo se cancela solo y te devolvemos todo.
            </p>
          )}
          {pagado && <BotonCompartirViaje compartir={compartirPuesto.bind(null, cupo.id)} />}
          {pagado && <EnlaceDeAyuda motivo={{ tipo: "cupo", referencia: cupo.id }} />}
          {telefonoConductor && (
            <a
              href={`tel:${telefonoConductor}`}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-texto-suave/30 font-semibold text-texto hover:bg-superficie"
            >
              <IconoTelefono className="size-5 shrink-0" />
              Llamar al conductor
            </a>
          )}
          {cupo.estado === "publicado" && (
            <BotonAccion
              accion={retirarPuesto}
              campos={{ cupo: cupo.id }}
              estilo="peligro"
              textoSi={aprobado ? "Sí, dejarlo" : "Sí, retirarla"}
              confirmar={(() => {
                if (!aprobado) return "¿Retirar tu solicitud de este cupo?";
                const salida = salidaDeCupo(miPuesto.pagado, saleMs, ahora);
                if (!salida.tarde) return miPuesto.pagado > 0 ? `¿Dejar tu puesto? Recuperas ${pesos(salida.devolucion)}.` : "¿Dejar tu puesto?";
                return `Faltan menos de 40 minutos: ${miPuesto.pagado > 0 ? `se te cobra ${pesos(salida.cobro)} (30 %), recuperas ${pesos(salida.devolucion)} y ` : ""}sumas una falta. ¿Dejar tu puesto?`;
              })()}
            >
              {aprobado ? "Dejar mi puesto" : "Retirar solicitud"}
            </BotonAccion>
          )}
        </section>
      ) : puedePedir ? (
        <FormularioPuesto cupoId={cupo.id} salida={salida} destino={destino} sentido={cupo.sentido} />
      ) : (
        <>
          {miPuesto?.estado === "rechazado" && <Aviso tipo="info">El conductor no aprobó tu solicitud en este cupo. Puedes buscar otro.</Aviso>}
          {miPuesto?.estado === "sin_pago" && <Aviso tipo="info">Perdiste el puesto porque no se pagó a tiempo. Si tu recarga fue aprobada, el saldo sigue en tu billetera. <Link href="/estudiante/cupos" className="inline-flex min-h-11 items-center font-semibold text-secundario">Buscar otro cupo</Link></Aviso>}
          {cupo.estado === "cancelado" && (
            <Aviso tipo="info">{cupo.vencio ? "Este cupo se canceló solo porque el conductor no salió a tiempo." : "El conductor canceló este cupo."}</Aviso>
          )}
          {cupo.estado === "terminado" && <Aviso tipo="info">{regreso ? "Este cupo ya terminó su recorrido." : "Este cupo ya llegó a la universidad."}</Aviso>}
          <Mapa etiqueta="Mapa del cupo" centro={salida} origen={salida} destino={destino} uEnElOrigen={regreso} className="h-52" />
        </>
      )}
    </main>
  );
}
