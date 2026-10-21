import type { Metadata } from "next";
import Link from "next/link";
import { cuposDisponibles, puestoActivoDelEstudiante } from "@/app/lib/consultas-cupo";
import { etiquetaPuesto } from "@/app/lib/cupo";
import { calificacionTexto, fechaCorta, nombreCorto, pesos } from "@/app/lib/formato";
import { exigirRol } from "@/app/lib/sesion";
import { EncabezadoPantalla } from "@/app/ui/comun/encabezado-pantalla";
import { EnVivo } from "@/app/ui/comun/en-vivo";
import { IconoEstrella } from "@/app/ui/comun/iconos-app";

export const metadata: Metadata = { title: "Cupos publicados" };

// Cupos que publicaron los conductores de su universidad, del más próximo al
// más lejano. Cada uno lleva a su detalle para pedir puesto.
export default async function PaginaCupos() {
  const { usuario } = await exigirRol("estudiante");
  const [cupos, miPuesto] = await Promise.all([cuposDisponibles(), puestoActivoDelEstudiante(usuario.id)]);

  return (
    <main className="space-y-5 px-5 pt-6">
      <EnVivo escuchas={[{ tabla: "cupos" }]} />
      <EncabezadoPantalla titulo="Cupos publicados" texto="Conductores que van a la U a una hora fija." volverA="/estudiante" />

      {miPuesto && (
        <Link href={`/estudiante/cupos/${miPuesto.cupo.id}`} className="block rounded-2xl border border-secundario/50 p-4 text-texto">
          <span className="block font-semibold">{etiquetaPuesto(miPuesto.puesto.estado)}</span>
          <span className="block text-sm text-texto-suave">Sale {fechaCorta(miPuesto.cupo.sale_en)} · Ver mi cupo</span>
        </Link>
      )}

      {cupos.length === 0 ? (
        <p role="status" className="rounded-2xl border border-texto-suave/25 p-6 text-center text-texto-suave">
          No hay cupos publicados por ahora. Aparecen aquí sin recargar.
        </p>
      ) : (
        <ul className="space-y-3">
          {cupos.map(({ cupo, conductor, vehiculo, libres }) => (
            <li key={cupo.id}>
              <Link href={`/estudiante/cupos/${cupo.id}`} className="block space-y-2 rounded-2xl bg-superficie p-4 text-texto">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-titulo text-lg font-bold">{fechaCorta(cupo.sale_en)}</span>
                  <span className="font-titulo font-bold">{pesos(cupo.precio)}</span>
                </span>
                <span className="block text-sm">Sale de {cupo.salida_texto}</span>
                <span className="flex items-center gap-1 text-sm text-texto-suave">
                  {conductor ? nombreCorto(conductor.nombre) : "Conductor"} ·
                  <IconoEstrella llena className="size-4 text-secundario" />
                  {conductor && conductor.total_calificaciones > 0 ? calificacionTexto(conductor.calificacion) : "Nuevo"}
                  {vehiculo && ` · ${vehiculo.marca} ${vehiculo.modelo}`}
                </span>
                <span className={`block text-sm font-semibold ${libres > 0 ? "text-secundario" : "text-texto-suave"}`}>
                  {libres > 0 ? `${libres} ${libres === 1 ? "puesto libre" : "puestos libres"}` : "Lleno"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
