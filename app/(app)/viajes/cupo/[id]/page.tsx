import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { comprobanteDeCupo } from "@/app/lib/consultas-comprobantes";
import { perfilActual } from "@/app/lib/sesion";
import { referenciaDeViaje, volverDelComprobante, type ParametrosUrl } from "@/app/lib/validaciones-historial";
import { ComprobanteViaje } from "@/app/ui/comun/comprobante-viaje";

export const metadata: Metadata = { title: "Detalle del cupo" };
const estados = { publicado: "Publicado", en_curso: "En camino", terminado: "Terminado", cancelado: "Cancelado" };

export default async function PaginaDetalleCupo({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<ParametrosUrl>;
}) {
  const [sesion, { id }, consulta] = await Promise.all([perfilActual(), params, searchParams]);
  if (!referenciaDeViaje.safeParse(id).success) notFound();
  const dato = await comprobanteDeCupo(id, sesion.usuario.id);
  if (!dato) notFound();
  const { cupo, ruta, movimientos, comision } = dato;
  return <ComprobanteViaje titulo="Detalle del cupo" referencia={id} fecha={cupo.sale_en}
    estado={cupo.vencio ? "No salió" : estados[cupo.estado]}
    origen={ruta.origen} destino={ruta.destino} movimientos={movimientos}
    comision={comision} volver={volverDelComprobante(consulta)} />;
}
