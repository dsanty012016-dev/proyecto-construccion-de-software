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
/** Cupos abiertos, con la hora de la consulta para agrupar por día en pantalla. */
export async function cuposDisponibles(): Promise<{ cupos: CupoDisponible[]; ahora: number }> {
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
  return {
    cupos: cupos.map((cupo) => ({
      cupo,
      conductor: perfiles.get(cupo.conductor_id) ?? null,
      vehiculo: vehiculos.find((v) => v.conductor_id === cupo.conductor_id) ?? null,
      libres: libres.get(cupo.id) ?? 0,
    })),
    ahora: Date.now(),
  };
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

// ---------------------------------------------------------------------------
// Historial y calificaciones de cupos (014)
// ---------------------------------------------------------------------------

/** Un cupo terminado o cancelado, visto por quien lo manejó o por quien iba. */
export interface CupoEnHistorial {
  cupo: FilaCupo;
  soyConductor: boolean;
  /** Mi puesto, si iba como estudiante. */
  puesto: FilaPuesto | null;
  /** Nombres de la otra parte: el conductor, o los estudiantes que llevó. */
  otros: string[];
  /** Queda alguien por calificar en este cupo. */
  porCalificar: boolean;
}

/** Puestos en los que de verdad se viajó: aprobados y pagados. */
function viajo(p: FilaPuesto) {
  return p.estado === "aprobado" && p.pagado > 0;
}

export async function historialDeCupos(usuarioId: string): Promise<CupoEnHistorial[]> {
  const supabase = await crearClienteServidor();
  const [comoConductor, misPuestos] = await Promise.all([
    supabase.from("cupos").select("*").eq("conductor_id", usuarioId).in("estado", ["terminado", "cancelado"]).order("sale_en", { ascending: false }).limit(20),
    supabase.from("puestos").select("*").eq("estudiante_id", usuarioId).in("estado", ["aprobado", "cancelado"]).limit(40),
  ]);
  const propios = comoConductor.data ?? [];
  const puestosMios = misPuestos.data ?? [];

  const [puestosDeMisCupos, cuposDeMisPuestos, calificadas] = await Promise.all([
    propios.length
      ? supabase.from("puestos").select("*").in("cupo_id", propios.map((c) => c.id)).eq("estado", "aprobado").gt("pagado", 0)
      : Promise.resolve({ data: [] as FilaPuesto[] }),
    puestosMios.length
      ? supabase.from("cupos").select("*").in("id", puestosMios.map((p) => p.cupo_id)).in("estado", ["terminado", "cancelado"])
      : Promise.resolve({ data: [] as FilaCupo[] }),
    supabase.from("calificaciones").select("puesto_id").eq("autor_id", usuarioId).not("puesto_id", "is", null),
  ]);
  const pasajeros = puestosDeMisCupos.data ?? [];
  const yaCalifique = new Set((calificadas.data ?? []).map((c) => c.puesto_id));
  const ids = [...pasajeros.map((p) => p.estudiante_id), ...(cuposDeMisPuestos.data ?? []).map((c) => c.conductor_id)];
  const perfiles = await perfilesPublicos(ids);
  const nombre = (id: string) => perfiles.get(id)?.nombre ?? "";

  const lista: CupoEnHistorial[] = propios.map((cupo) => {
    const suyos = pasajeros.filter((p) => p.cupo_id === cupo.id);
    return {
      cupo,
      soyConductor: true,
      puesto: null,
      otros: suyos.map((p) => nombre(p.estudiante_id)).filter(Boolean),
      porCalificar: cupo.estado === "terminado" && suyos.some((p) => !yaCalifique.has(p.id)),
    };
  });
  for (const cupo of cuposDeMisPuestos.data ?? []) {
    const puesto = puestosMios.find((p) => p.cupo_id === cupo.id);
    if (!puesto) continue;
    // Terminados en los que viajé, o cancelados por el conductor.
    if (!(cupo.estado === "terminado" ? viajo(puesto) : puesto.estado === "cancelado")) continue;
    lista.push({
      cupo,
      soyConductor: false,
      puesto,
      otros: [nombre(cupo.conductor_id)].filter(Boolean),
      porCalificar: cupo.estado === "terminado" && !yaCalifique.has(puesto.id),
    });
  }
  return lista.sort((a, b) => Date.parse(b.cupo.sale_en) - Date.parse(a.cupo.sale_en));
}

export interface CupoParaCalificar {
  cupo: FilaCupo;
  soyConductor: boolean;
  /** A quién me falta calificar: un puesto y el nombre de la otra persona. */
  pendientes: { puestoId: string; nombre: string }[];
}

/** Lo que falta calificar de un cupo terminado (null si no viajé en él). */
export async function cupoParaCalificar(cupoId: string, usuarioId: string): Promise<CupoParaCalificar | null> {
  const supabase = await crearClienteServidor();
  const { data: cupo } = await supabase.from("cupos").select("*").eq("id", cupoId).maybeSingle();
  if (!cupo || cupo.estado !== "terminado") return null;
  const soyConductor = cupo.conductor_id === usuarioId;

  const consulta = supabase.from("puestos").select("*").eq("cupo_id", cupoId).eq("estado", "aprobado").gt("pagado", 0);
  const [{ data: puestos }, { data: calificadas }] = await Promise.all([
    soyConductor ? consulta : consulta.eq("estudiante_id", usuarioId),
    supabase.from("calificaciones").select("puesto_id").eq("autor_id", usuarioId).not("puesto_id", "is", null),
  ]);
  const lista = puestos ?? [];
  if (lista.length === 0) return null;
  const yaCalifique = new Set((calificadas ?? []).map((c) => c.puesto_id));
  const faltan = lista.filter((p) => !yaCalifique.has(p.id));
  const perfiles = await perfilesPublicos(soyConductor ? faltan.map((p) => p.estudiante_id) : [cupo.conductor_id]);

  return {
    cupo,
    soyConductor,
    pendientes: faltan.map((p) => ({
      puestoId: p.id,
      nombre: perfiles.get(soyConductor ? p.estudiante_id : cupo.conductor_id)?.nombre ?? (soyConductor ? "Estudiante" : "Conductor"),
    })),
  };
}
