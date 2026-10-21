import "server-only";
import { type FilaVehiculo } from "./consultas-viaje";
import { TIPOS_DOCUMENTO, type TipoDocumento } from "./documentos";
import { crearClienteServidor } from "./supabase/server";
import type { Database } from "./supabase/tipos";

// Lecturas de la verificación del conductor. RLS (011) deja ver los documentos
// solo a su dueño y a los administradores; los archivos se abren con enlaces
// firmados que vencen en 5 minutos.

export type FilaDocumento = Database["public"]["Tables"]["documentos_conductor"]["Row"];

const VIGENCIA_ENLACE_SEGUNDOS = 300;

/** Documentos del conductor, uno por tipo (undefined si no lo ha enviado). */
export async function misDocumentos(conductorId: string): Promise<Partial<Record<TipoDocumento, FilaDocumento>>> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("documentos_conductor").select("*").eq("conductor_id", conductorId);
  const porTipo: Partial<Record<TipoDocumento, FilaDocumento>> = {};
  for (const doc of data ?? []) porTipo[doc.tipo] = doc;
  return porTipo;
}

export async function estoyVerificado(conductorId: string): Promise<boolean> {
  const docs = await misDocumentos(conductorId);
  return TIPOS_DOCUMENTO.every((tipo) => docs[tipo]?.estado === "aprobado");
}

export interface ConductorPorRevisar {
  conductorId: string;
  nombre: string;
  telefono: string | null;
  vehiculo: FilaVehiculo | null;
  documentos: (FilaDocumento & { enlace: string | null })[];
}

/** Para el panel de administración: conductores con documentos pendientes. */
export async function conductoresPorRevisar(): Promise<ConductorPorRevisar[]> {
  const supabase = await crearClienteServidor();
  const { data: pendientes } = await supabase
    .from("documentos_conductor")
    .select("*")
    .eq("estado", "pendiente")
    .order("enviado_en", { ascending: true })
    .limit(60);
  const lista = pendientes ?? [];
  if (lista.length === 0) return [];

  const ids = [...new Set(lista.map((d) => d.conductor_id))];
  const [perfiles, vehiculos, enlaces] = await Promise.all([
    supabase.from("perfiles").select("id, nombre, telefono").in("id", ids),
    supabase.from("vehiculos").select("*").in("conductor_id", ids),
    supabase.storage.from("documentos").createSignedUrls(lista.map((d) => d.ruta), VIGENCIA_ENLACE_SEGUNDOS),
  ]);
  const enlacePorRuta = new Map((enlaces.data ?? []).map((e) => [e.path, e.signedUrl]));

  return ids.map((id) => {
    const perfil = (perfiles.data ?? []).find((p) => p.id === id);
    return {
      conductorId: id,
      nombre: perfil?.nombre ?? "Conductor",
      telefono: perfil?.telefono ?? null,
      vehiculo: (vehiculos.data ?? []).find((v) => v.conductor_id === id) ?? null,
      documentos: lista
        .filter((d) => d.conductor_id === id)
        .map((d) => ({ ...d, enlace: enlacePorRuta.get(d.ruta) ?? null })),
    };
  });
}
