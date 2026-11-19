import "server-only";
import { type FilaVehiculo } from "./consultas-viaje";
import type { TipoDocumento } from "./documentos";
import { preparacionConductor } from "./preparacion-conductor";
import { crearClienteServidor } from "./supabase/server";
import type { Database } from "./supabase/tipos";

// Lecturas de la verificación del conductor. RLS (011) deja ver los documentos
// solo a su dueño y a los administradores; los archivos se abren con enlaces
// firmados que vencen en 5 minutos.

export type FilaDocumento = Database["public"]["Tables"]["documentos_conductor"]["Row"];

const VIGENCIA_ENLACE_SEGUNDOS = 300;

export function horaDeRevisionDocumentos(): number { return Date.now(); }

/** Documentos del conductor, uno por tipo (undefined si no lo ha enviado). */
export async function misDocumentos(conductorId: string): Promise<Partial<Record<TipoDocumento, FilaDocumento>>> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("documentos_conductor").select("*").eq("conductor_id", conductorId).throwOnError();
  const porTipo: Partial<Record<TipoDocumento, FilaDocumento>> = {};
  for (const doc of data ?? []) porTipo[doc.tipo] = doc;
  return porTipo;
}

export async function estoyVerificado(conductorId: string): Promise<boolean> {
  const docs = await misDocumentos(conductorId);
  return preparacionConductor(true, docs, false, Date.now()).verificado;
}

export interface ConductorPorRevisar {
  conductorId: string;
  nombre: string;
  telefono: string | null;
  vehiculo: FilaVehiculo | null;
  documentos: (FilaDocumento & { enlace: string | null })[];
}

/** Para el panel de administración: conductores con documentos pendientes. */
export async function conductoresPorRevisar(pagina = 1): Promise<ConductorPorRevisar[]> {
  const supabase = await crearClienteServidor();
  const inicio = (pagina - 1) * 20;
  const { data: pendientes } = await supabase
    .from("documentos_conductor")
    .select("*")
    .eq("estado", "pendiente")
    .order("enviado_en", { ascending: true })
    .order("id").range(inicio, inicio + 19).throwOnError();
  const lista = pendientes ?? [];
  if (lista.length === 0) return [];

  const ids = [...new Set(lista.map((d) => d.conductor_id))];
  const [perfiles, vehiculos, enlaces] = await Promise.all([
    supabase.from("perfiles").select("id, nombre, telefono").in("id", ids).throwOnError(),
    supabase.from("vehiculos").select("*").in("conductor_id", ids).throwOnError(),
    supabase.storage.from("documentos").createSignedUrls(lista.map((d) => d.ruta), VIGENCIA_ENLACE_SEGUNDOS),
  ]);
  if (enlaces.error) throw new Error("No pudimos abrir los documentos. Intenta de nuevo.");
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
