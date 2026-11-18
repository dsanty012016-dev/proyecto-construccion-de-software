import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { comprobanteDeViaje } from "@/app/lib/consultas-comprobantes";
import { etiquetaEstado } from "@/app/lib/formato";
import { perfilActual } from "@/app/lib/sesion";
import { referenciaDeViaje, volverDelComprobante, type ParametrosUrl } from "@/app/lib/validaciones-historial";
import { ComprobanteViaje } from "@/app/ui/comun/comprobante-viaje";

export const metadata: Metadata = { title: "Detalle del viaje" };

export default async function PaginaDetalleViaje({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<ParametrosUrl>;
}) {
  const [sesion, { id }, consulta] = await Promise.all([perfilActual(), params, searchParams]);
  if (!referenciaDeViaje.safeParse(id).success) notFound();
  const dato = await comprobanteDeViaje(id, sesion.usuario.id);
  if (!dato) notFound();
  const { viaje, movimientos, comision } = dato;
  return <ComprobanteViaje titulo="Detalle del viaje" referencia={id}
    fecha={viaje.terminado_en ?? viaje.cancelado_en ?? viaje.creado_en}
    estado={viaje.vencio ? "Venció sin conductor" : etiquetaEstado(viaje.estado)}
    origen={viaje.origen_texto} destino={viaje.destino_texto}
    movimientos={movimientos} comision={comision} volver={volverDelComprobante(consulta)} />;
}
