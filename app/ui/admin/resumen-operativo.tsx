import { resumenOperativo } from "@/app/lib/consultas-admin";

export async function ResumenOperativo() {
  const datos = await resumenOperativo();
  if (!datos) return <p role="status" className="text-sm text-texto-suave">No pudimos consultar el estado operativo.</p>;
  const filas = [
    { nombre: "Recargas pendientes hace más de 30 minutos", total: datos.recargas_pendientes },
    { nombre: "Retiros que vencen en 24 horas", total: datos.retiros_por_vencer },
    { nombre: "Retiros vencidos", total: datos.retiros_vencidos },
    { nombre: "Avisos sin completar hace más de 5 minutos", total: datos.avisos_atrasados },
    { nombre: "Archivos que cumplieron su plazo de conservación", total: datos.archivos_por_limpiar },
    { nombre: "Licencias aprobadas sin fecha de vencimiento", total: datos.licencias_sin_vigencia },
  ];
  return <section className="space-y-3 rounded-2xl bg-superficie p-4" aria-labelledby="titulo-operacion">
    <h2 id="titulo-operacion" className="text-lg">Estado operativo</h2>
    <p className="text-sm text-texto-suave">Checkout habilitado en la base: {datos.checkout_real ? "dinero real" : datos.checkout_pruebas ? "Wompi Sandbox" : "ninguno"}.</p>
    <dl className="divide-y divide-texto-suave/20 text-sm">
      {filas.map(({ nombre, total }) => <div key={nombre} className="flex justify-between gap-3 py-2">
        <dt>{nombre}</dt><dd className="tabular-nums font-semibold">{total}</dd>
      </div>)}
    </dl>
  </section>;
}
