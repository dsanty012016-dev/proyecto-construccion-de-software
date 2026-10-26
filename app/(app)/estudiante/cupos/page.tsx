import type { Metadata } from "next";
import Link from "next/link";
import { cuposDisponibles, puestoActivoDelEstudiante, type CupoDisponible } from "@/app/lib/consultas-cupo";
import { esMoto, etiquetaPuesto } from "@/app/lib/cupo";
import { diaRelativo, fechaCorta, horaCorta, nombreCorto, pesos } from "@/app/lib/formato";
import { MINUTOS_CUPO_SIN_COBRO, MINUTOS_LIMITE_PAGO, COBRO_CUPO_TARDE } from "@/app/lib/pagos";
import { PALABRAS, SENTIDOS, type Sentido } from "@/app/lib/sentido";
import { exigirRol } from "@/app/lib/sesion";
import { EncabezadoPantalla } from "@/app/ui/comun/encabezado-pantalla";
import { EnVivo } from "@/app/ui/comun/en-vivo";
import { IconoSiguiente } from "@/app/ui/comun/iconos-app";
import { Nota } from "@/app/ui/comun/nota";

export const metadata: Metadata = { title: "Cupos publicados" };

// Cupos de los conductores de su universidad (rediseño): un tablero de
// salidas agrupado por día, con la hora grande y los puestos libres a la vista.
// Arriba se elige si se ven los que van a la U o los que salen de ella (017).
export default async function PaginaCupos({ searchParams }: { searchParams: Promise<{ sentido?: string }> }) {
  const { usuario } = await exigirRol("estudiante");
  const sentido: Sentido = (await searchParams).sentido === "regreso" ? "regreso" : "ida";
  const [{ cupos: todos, ahora }, miPuesto] = await Promise.all([cuposDisponibles(), puestoActivoDelEstudiante(usuario.id)]);
  const cupos = todos.filter((item) => item.cupo.sentido === sentido);

  // Ya vienen ordenados por hora de salida; se agrupan seguidos por día.
  const dias: { dia: string; cupos: CupoDisponible[] }[] = [];
  for (const item of cupos) {
    const dia = diaRelativo(item.cupo.sale_en, ahora);
    const ultimo = dias[dias.length - 1];
    if (ultimo && ultimo.dia === dia) ultimo.cupos.push(item);
    else dias.push({ dia, cupos: [item] });
  }

  return (
    <main className="flex min-h-[calc(100dvh-6rem)] flex-col px-5 pt-4">
      <EnVivo escuchas={[{ tabla: "cupos" }]} />
      <EncabezadoPantalla titulo="Salidas con hora fija" texto="Conductores que van a la U o salen de ella a una hora fija" volverA="/estudiante" />
      <nav aria-label="Sentido de los cupos" className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-superficie p-1">
        {SENTIDOS.map((s) => (
          <Link
            key={s}
            href={s === "ida" ? "/estudiante/cupos" : "/estudiante/cupos?sentido=regreso"}
            aria-current={s === sentido ? "page" : undefined}
            className={`flex min-h-11 items-center justify-center rounded-xl text-sm font-semibold ${s === sentido ? "bg-primario text-texto" : "text-texto-suave hover:text-texto"}`}
          >
            {PALABRAS[s].corto}
          </Link>
        ))}
      </nav>

      {miPuesto && (
        <Link
          href={`/estudiante/cupos/${miPuesto.cupo.id}`}
          className="mt-4 flex min-h-14 items-center gap-3 rounded-2xl bg-superficie px-4 py-3 text-texto"
        >
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{etiquetaPuesto(miPuesto.puesto.estado)}</span>
            <span className="block text-[13px] text-texto-suave">Sale {fechaCorta(miPuesto.cupo.sale_en)} · Ver mi cupo</span>
          </span>
          <IconoSiguiente className="size-5 text-texto-suave" />
        </Link>
      )}

      {cupos.length === 0 ? (
        <p role="status" className="mt-8 text-center text-texto-suave">
          {sentido === "regreso" ? "No hay cupos saliendo de la U por ahora." : "No hay cupos hacia la U por ahora."} Aparecen aquí sin recargar.
        </p>
      ) : (
        dias.map(({ dia, cupos: delDia }) => (
          <section key={dia} aria-labelledby={`dia-${dia}`} className="mt-5">
            <h2 id={`dia-${dia}`} className="font-texto text-xs font-bold text-texto-suave">
              {dia}
            </h2>
            <ul>
              {delDia.map((item) => (
                <FilaCupo key={item.cupo.id} item={item} />
              ))}
            </ul>
          </section>
        ))
      )}

      <p className="mt-auto border-t border-texto-suave/15 py-4 text-[13px] leading-relaxed text-texto-suave">
        Pides el puesto con tu punto ({sentido === "regreso" ? "donde te bajas" : "donde te recogen"}) y el conductor lo aprueba. Pagas hasta {MINUTOS_LIMITE_PAGO} min antes de salir. Si te retiras con
        menos de {MINUTOS_CUPO_SIN_COBRO} min, se cobra el {COBRO_CUPO_TARDE} % y suma un strike.
      </p>
    </main>
  );
}

function FilaCupo({ item }: { item: CupoDisponible }) {
  const { cupo, conductor, vehiculo, libres } = item;
  const { hora, periodo } = horaCorta(cupo.sale_en);
  const lleno = libres <= 0;
  const quien = (
    <>
      {conductor ? nombreCorto(conductor.nombre) : "Conductor"} · <Nota promedio={conductor?.calificacion} total={conductor?.total_calificaciones ?? 0} />
      {vehiculo && esMoto(vehiculo.placa) && " · moto"}
    </>
  );

  return (
    <li className="border-b border-texto-suave/15 last:border-b-0">
      <Link
        href={`/estudiante/cupos/${cupo.id}`}
        className={`grid grid-cols-[76px_minmax(0,1fr)_auto] items-start gap-x-3 py-4 ${lleno ? "text-texto-suave" : "text-texto"}`}
      >
        <span className="font-titulo text-[26px] leading-none font-bold tracking-tight tabular-nums">
          {hora}
          <span className="mt-1 block font-texto text-xs font-semibold tracking-normal text-texto-suave">{periodo}</span>
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="font-bold">{quien}</span>
          <span className="truncate text-[13px] text-texto-suave">
            {cupo.sentido === "regreso" ? `Hasta ${cupo.destino_texto}` : `Desde ${cupo.salida_texto}`}
          </span>
          {lleno ? (
            <span className="text-[13px]">Sin puestos libres</span>
          ) : (
            <span className="mt-0.5 flex items-center gap-1">
              <span className="sr-only">
                {libres} de {cupo.puestos} puestos libres
              </span>
              {Array.from({ length: cupo.puestos }, (_, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className={`size-2.5 rounded-full ${i < libres ? "bg-secundario" : "border-[1.5px] border-texto-suave"}`}
                />
              ))}
              <span aria-hidden="true" className="ml-1 text-xs text-texto-suave">
                {libres} {libres === 1 ? "libre" : "libres"}
              </span>
            </span>
          )}
        </span>
        <span className="text-right font-titulo font-bold tabular-nums">
          {lleno ? (
            "Lleno"
          ) : (
            <>
              {pesos(cupo.precio)}
              <span className="block font-texto text-xs font-semibold text-texto-suave">puesto</span>
            </>
          )}
        </span>
      </Link>
    </li>
  );
}
