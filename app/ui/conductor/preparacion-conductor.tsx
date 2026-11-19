import Link from "next/link";
import { preparacionConductor, type DocumentosPreparacion } from "@/app/lib/preparacion-conductor";

export function PreparacionConductor({ tieneVehiculo, documentos, disponible, ahora }: { tieneVehiculo: boolean; documentos: DocumentosPreparacion; disponible: boolean; ahora: number }) {
  const p = preparacionConductor(tieneVehiculo, documentos, disponible, ahora);
  if (p.paso === "listo") return null;
  const pasos = [
    { id: "vehiculo", texto: "Registra tu vehículo", listo: tieneVehiculo },
    { id: "documentos", texto: `Envía tus documentos · ${p.enviados} de 3 enviados`, listo: p.enviados === 3 && p.rechazados === 0 },
    { id: "revision", texto: `Revisión del equipo · ${p.aprobados} de 3 aprobados`, listo: p.verificado },
    { id: "disponibilidad", texto: "Activa tu disponibilidad", listo: disponible && tieneVehiculo && p.verificado },
  ];
  return <section aria-labelledby="preparacion-titulo" className="space-y-3 rounded-2xl border border-texto-suave/30 p-4">
    <h2 id="preparacion-titulo" className="text-lg font-bold">{p.paso === "disponibilidad" ? "Todo listo para conducir" : "Prepara tu cuenta para conducir"}</h2>
    {p.licenciaVencida && <p className="text-sm font-semibold text-error">Tu licencia venció. Envía la renovación desde Mis documentos.</p>}
    <p className="text-sm text-texto-suave">{p.paso === "vehiculo" ? "Empieza por los datos del vehículo que usarás." : p.paso === "documentos" ? p.rechazados > 0 ? "Corrige los documentos rechazados; los aprobados se conservan." : "Envía cédula, licencia y tarjeta de propiedad para que el equipo los revise." : p.paso === "revision" ? "Ya recibimos tus documentos. Cada uno se revisa en un máximo de 7 días desde su envío. Consulta su estado y fecha límite." : "Activa el interruptor de abajo para recibir solicitudes de estudiantes."}</p>
    {p.paso !== "disponibilidad" && <Link href={p.paso === "vehiculo" ? "/conductor/vehiculo" : "/conductor/documentos"} className="flex min-h-12 items-center justify-center rounded-xl bg-primario px-4 py-3 text-center prensa font-semibold text-sobre-primario">{p.paso === "vehiculo" ? "Registrar mi vehículo" : p.paso === "revision" ? "Consultar revisión" : p.rechazados > 0 ? "Corregir documentos" : "Enviar documentos"}</Link>}
    {p.paso !== "disponibilidad" && <ol className="space-y-2 border-t border-texto-suave/20 pt-3 text-sm">
      {pasos.map((paso, i) => <li key={paso.id} aria-current={p.paso === paso.id ? "step" : undefined} className={`flex items-start gap-2 ${p.paso === paso.id ? "font-bold text-texto" : "text-texto-suave"}`}>
        <span className="shrink-0 font-bold" aria-hidden="true">{i + 1}.</span>
        <span className="min-w-0">{paso.texto}{paso.listo && <span className="text-secundario"> · Completado</span>}</span>
      </li>)}
    </ol>}
  </section>;
}
