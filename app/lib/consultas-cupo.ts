import "server-only";
import { type FilaVehiculo, type PerfilPublico, perfilesPublicos } from "./consultas-viaje";
import { crearClienteServidor } from "./supabase/server";
import type { Database } from "./supabase/tipos";

// Lecturas de las pantallas de cupos. Qué ve cada quien lo decide RLS
// (010-cupos.sql); los puestos libres salen de puestos_libres(), que no deja
// ver quién ocupa cada puesto.

export type FilaCupo = Database["public"]["Tables"]["cupos"]["Row"];
export type FilaPuesto = Database["public"]["Tables"]["puestos"]["Row"];

async function libresDe(ids: string[]): Promise<Map<string, number>> {
  const mapa = new Map<string, number>();
  if (ids.length === 0) return mapa;
  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc("puestos_libres", { p_cupos: ids });
  for (const fila of data ?? []) mapa.set(fila.cupo_id, fila.libres);
  return mapa;
}

async function vehiculosDe(conductores: string[]): Promise<FilaVehiculo[]> {
  if (conductores.length === 0) return [];
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("vehiculos").select("*").in("conductor_id", [...new Set(conductores)]);
  return data ?? [];
}

/** Teléfonos que RLS deja ver: los de la otra persona de un cupo activo con puesto aprobado. */
async function telefonosDe(ids: string[]): Promise<Map<string, string | null>> {
  const mapa = new Map<string, string | null>();
  if (ids.length === 0) return mapa;
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("perfiles").select("id, telefono").in("id", [...new Set(ids)]);
  for (const fila of data ?? []) mapa.set(fila.id, fila.telefono);
  return mapa;
}

// ---------------------------------------------------------------------------
// Conductor
// ---------------------------------------------------------------------------

export interface SolicitudDePuesto {
  puesto: FilaPuesto;
  estudiante: PerfilPublico | null;
  telefono: string | null;
}

export interface CupoDelConductor {
  cupo: FilaCupo;
  libres: number;
  pendientes: SolicitudDePuesto[];
  aprobados: SolicitudDePuesto[];
}

export async function cupoActivoDelConductor(conductorId: string): Promise<CupoDelConductor | null> {
  const supabase = await crearClienteServidor();
  const { data: cupo } = await supabase
    .from("cupos")
    .select("*")
    .eq("conductor_id", conductorId)
    .in("estado", ["publicado", "en_curso"])
    .maybeSingle();
  if (!cupo) return null;

  const { data: puestos } = await supabase
    .from("puestos")
    .select("*")
    .eq("cupo_id", cupo.id)
    .in("estado", ["pendiente", "aprobado"])
    .order("creado_en", { ascending: true });
  const lista = puestos ?? [];
  const ids = lista.map((p) => p.estudiante_id);
  const [perfiles, telefonos, libres] = await Promise.all([perfilesPublicos(ids), telefonosDe(ids), libresDe([cupo.id])]);

  const solicitudes = lista.map((puesto) => ({
    puesto,
    estudiante: perfiles.get(puesto.estudiante_id) ?? null,
    telefono: telefonos.get(puesto.estudiante_id) ?? null,
  }));
  return {
    cupo,
    libres: libres.get(cupo.id) ?? 0,
    pendientes: solicitudes.filter((s) => s.puesto.estado === "pendiente"),
    aprobados: solicitudes.filter((s) => s.puesto.estado === "aprobado"),
  };
}

// ---------------------------------------------------------------------------
// Estudiante
// ---------------------------------------------------------------------------

export interface CupoDisponible {
  cupo: FilaCupo;
  conductor: PerfilPublico | null;
  vehiculo: FilaVehiculo | null;
  libres: number;
}

/** Cupos publicados de su universidad que todavía no han salido, del más próximo al más lejano. */
export async function cuposDisponibles(): Promise<CupoDisponible[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("cupos")
    .select("*")
    .eq("estado", "publicado")
    .gt("sale_en", new Date().toISOString())
    .order("sale_en", { ascending: true })
    .limit(30);
  const cupos = data ?? [];
  const conductores = cupos.map((c) => c.conductor_id);
  const [perfiles, vehiculos, libres] = await Promise.all([
    perfilesPublicos(conductores),
    vehiculosDe(conductores),
    libresDe(cupos.map((c) => c.id)),
  ]);
  return cupos.map((cupo) => ({
    cupo,
    conductor: perfiles.get(cupo.conductor_id) ?? null,
    vehiculo: vehiculos.find((v) => v.conductor_id === cupo.conductor_id) ?? null,
    libres: libres.get(cupo.id) ?? 0,
  }));
}

export interface CupoParaEstudiante extends CupoDisponible {
  miPuesto: FilaPuesto | null;
  /** Solo con el puesto aprobado y el cupo activo. */
  telefonoConductor: string | null;
  /** Hora de la consulta, para calcular límites de pago y cobros en pantalla. */
  ahora: number;
}

export async function cupoParaEstudiante(cupoId: string, estudianteId: string): Promise<CupoParaEstudiante | null> {
  const supabase = await crearClienteServidor();
  const { data: cupo } = await supabase.from("cupos").select("*").eq("id", cupoId).maybeSingle();
  if (!cupo) return null;
  const [miPuesto, perfiles, vehiculos, libres, telefonos] = await Promise.all([
    supabase.from("puestos").select("*").eq("cupo_id", cupoId).eq("estudiante_id", estudianteId).maybeSingle(),
    perfilesPublicos([cupo.conductor_id]),
    vehiculosDe([cupo.conductor_id]),
    libresDe([cupo.id]),
    telefonosDe([cupo.conductor_id]),
  ]);
  return {
    cupo,
    conductor: perfiles.get(cupo.conductor_id) ?? null,
    vehiculo: vehiculos[0] ?? null,
    libres: libres.get(cupo.id) ?? 0,
    miPuesto: miPuesto.data ?? null,
    telefonoConductor: telefonos.get(cupo.conductor_id) ?? null,
    ahora: Date.now(),
  };
}

/** El puesto que el estudiante tiene en marcha (pendiente o aprobado en un cupo activo). */
export async function puestoActivoDelEstudiante(estudianteId: string): Promise<{ puesto: FilaPuesto; cupo: FilaCupo } | null> {
  const supabase = await crearClienteServidor();
  const { data: puestos } = await supabase
    .from("puestos")
    .select("*")
    .eq("estudiante_id", estudianteId)
    .in("estado", ["pendiente", "aprobado"]);
  const lista = puestos ?? [];
  if (lista.length === 0) return null;
  const { data: cupos } = await supabase
    .from("cupos")
    .select("*")
    .in("id", lista.map((p) => p.cupo_id))
    .in("estado", ["publicado", "en_curso"]);
  for (const cupo of cupos ?? []) {
    const puesto = lista.find((p) => p.cupo_id === cupo.id);
    if (puesto) return { puesto, cupo };
  }
  return null;
}
