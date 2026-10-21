import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { retirarPuesto } from "@/app/lib/acciones-cupo";
import { cupoParaEstudiante } from "@/app/lib/consultas-cupo";
import { etiquetaPuesto } from "@/app/lib/cupo";
import { calificacionTexto, fechaCorta, nombreCorto, pesos } from "@/app/lib/formato";
import { exigirRol } from "@/app/lib/sesion";
import { Aviso } from "@/app/ui/auth/campos";
import { Avatar } from "@/app/ui/comun/avatar";
import { BotonAccion } from "@/app/ui/comun/boton-accion";
import { EncabezadoPantalla } from "@/app/ui/comun/encabezado-pantalla";
import { EnVivo } from "@/app/ui/comun/en-vivo";
import { IconoEstrella, IconoTelefono } from "@/app/ui/comun/iconos-app";
import { Mapa } from "@/app/ui/comun/mapa";
import { RutaViaje } from "@/app/ui/comun/ruta-viaje";
import { FormularioPuesto } from "@/app/ui/estudiante/formulario-puesto";

export const metadata: Metadata = { title: "Cupo" };

export default async function PaginaCupo({ params }: { params: Promise<{ id: string }> }) {
  const { usuario } = await exigirRol("estudiante");
  const { id } = await params;
  const datos = await cupoParaEstudiante(id, usuario.id);
  if (!datos) redirect("/estudiante/cupos");
  const { cupo, conductor, vehiculo, libres, miPuesto, telefonoConductor } = datos;
  const salida = { lat: cupo.salida_lat, lng: cupo.salida_lng };
  const destino = { lat: cupo.destino_lat, lng: cupo.destino_lng };
  const activo = cupo.estado === "publicado" || cupo.estado === "en_curso";
  const tengoPuesto = miPuesto?.estado === "pendiente" || miPuesto?.estado === "aprobado";
  const aprobado = miPuesto?.estado === "aprobado";
  const puedePedir = cupo.estado === "publicado" && libres > 0 && !tengoPuesto && miPuesto?.estado !== "rechazado";
  const nombre = conductor ? nombreCorto(conductor.nombre) : "el conductor";

  return (
    <main className="space-y-5 px-5 pt-6">
      <EnVivo escuchas={[{ tabla: "cupos", filtro: `id=eq.${cupo.id}` }, { tabla: "puestos", filtro: `cupo_id=eq.${cupo.id}` }]} />
      <EncabezadoPantalla titulo={`Cupo de ${nombre}`} volverA="/estudiante/cupos" />

      <section aria-label="Datos del cupo" className="space-y-4 rounded-2xl bg-superficie p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-titulo text-lg font-bold">Sale {fechaCorta(cupo.sale_en)}</p>
          <p className="font-titulo text-lg font-bold">{pesos(cupo.precio)}</p>
        </div>
        <RutaViaje origen={cupo.salida_texto} destino={cupo.destino_texto} />
        <div className="flex items-center gap-3 border-t border-texto-suave/20 pt-4">
          <Avatar nombre={conductor?.nombre ?? "Conductor"} />
          <div className="min-w-0 flex-1">
            <p className="font-bold">{conductor ? nombreCorto(conductor.nombre) : "Conductor"}</p>
            <p className="flex items-center gap-1 text-sm text-texto-suave">
              <IconoEstrella llena className="size-4 text-secundario" />
              {conductor && conductor.total_calificaciones > 0 ? calificacionTexto(conductor.calificacion) : "Nuevo"}
              {vehiculo && ` · ${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.color}`}
            </p>
          </div>
          {aprobado && vehiculo && (
            <p className="rounded-lg bg-texto px-2.5 py-1 font-titulo text-sm font-bold tracking-wider text-fondo">{vehiculo.placa}</p>
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
          <p className="text-sm">Te subes en: {miPuesto.recogida_texto}</p>
          <Mapa
            etiqueta="Mapa del cupo con tu punto de recogida"
            centro={salida}
            origen={salida}
            destino={destino}
            paradas={[{ lat: miPuesto.recogida_lat, lng: miPuesto.recogida_lng }]}
            className="h-52"
          />
          {aprobado && (
            <p className="text-sm text-texto-suave">Paga tu puesto a más tardar 10 minutos antes de la salida (la billetera llega pronto).</p>
          )}
          {telefonoConductor && (
            <a
              href={`tel:${telefonoConductor}`}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-texto-suave/30 font-semibold text-texto hover:bg-superficie"
            >
              <IconoTelefono className="size-5" />
              Llamar al conductor
            </a>
          )}
          {cupo.estado === "publicado" && (
            <BotonAccion accion={retirarPuesto} campos={{ cupo: cupo.id }} estilo="peligro" confirmar="¿Retirar tu solicitud de este cupo?">
              {aprobado ? "Dejar mi puesto" : "Retirar solicitud"}
            </BotonAccion>
          )}
        </section>
      ) : puedePedir ? (
        <FormularioPuesto cupoId={cupo.id} salida={salida} destino={destino} />
      ) : (
        <>
          {miPuesto?.estado === "rechazado" && <Aviso tipo="info">El conductor no aprobó tu solicitud en este cupo. Puedes buscar otro.</Aviso>}
          {cupo.estado === "cancelado" && <Aviso tipo="info">El conductor canceló este cupo.</Aviso>}
          {cupo.estado === "terminado" && <Aviso tipo="info">Este cupo ya llegó a la universidad.</Aviso>}
          <Mapa etiqueta="Mapa del cupo" centro={salida} origen={salida} destino={destino} className="h-52" />
        </>
      )}
    </main>
  );
}
