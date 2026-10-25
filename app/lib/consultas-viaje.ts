import "server-only";
import { crearClienteServidor } from "./supabase/server";
import type { Database } from "./supabase/tipos";

// Lecturas de las pantallas de viaje. Solo leen: los cambios van por las
// Server Actions (acciones-viaje.ts). Qué puede ver cada quien lo decide la
// base de datos con RLS (004-viajes.sql); aquí solo se piden los datos.

export type FilaViaje = Database["public"]["Tables"]["viajes"]["Row"];
export type FilaOferta = Database["public"]["Tables"]["ofertas"]["Row"];
export type FilaVehiculo = Database["public"]["Tables"]["vehiculos"]["Row"];
export type PerfilPublico = Database["public"]["Functions"]["perfiles_publicos"]["Returns"][number];

const ACTIVOS: FilaViaje["estado"][] = ["solicitado", "aceptado", "en_curso"];

/** Nombre y reputación de otras personas (misma universidad, sin teléfono). */
export async function perfilesPublicos(ids: string[]): Promise<Map<string, PerfilPublico>> {
  const mapa = new Map<string, PerfilPublico>();
  if (ids.length === 0) return mapa;
  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc("perfiles_publicos", { p_ids: [...new Set(ids)] });
  for (const perfil of data ?? []) mapa.set(perfil.id, perfil);
  return mapa;
}

/** Perfil completo de la otra persona de un viaje aceptado o en curso (con teléfono). */
async function contactoDelViaje(id: string) {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("perfiles").select("id, nombre, telefono").eq("id", id).maybeSingle();
  return data;
}

export interface ConductorConOferta {
  ofertaId: string;
  precio: number;
  creadaEn: string;
  conductor: PerfilPublico;
  vehiculo: FilaVehiculo | null;
}

export interface ViajeDelEstudiante {
  viaje: FilaViaje;
  /** Ofertas activas (solo mientras el viaje está "solicitado"). */
  ofertas: ConductorConOferta[];
  /** Conductor asignado (viaje aceptado o en curso). */
  conductor: { perfil: PerfilPublico | null; telefono: string | null; vehiculo: FilaVehiculo | null } | null;
}

export async function viajeActivoDelEstudiante(estudianteId: string): Promise<ViajeDelEstudiante | null> {
  const supabase = await crearClienteServidor();
  const { data: viaje } = await supabase
    .from("viajes")
    .select("*")
    .eq("estudiante_id", estudianteId)
    .in("estado", ACTIVOS)
    .maybeSingle();
  if (!viaje) return null;

  if (viaje.estado === "solicitado") {
    const { data: ofertas } = await supabase
      .from("ofertas")
      .select("*")
      .eq("viaje_id", viaje.id)
      .eq("estado", "activa")
      .order("precio", { ascending: true });
    const lista = ofertas ?? [];
    // Perfiles y vehículos a la vez (antes iban uno detrás del otro).
    const [perfiles, { data: vehiculos }] = await Promise.all([
      perfilesPublicos(lista.map((o) => o.conductor_id)),
      lista.length
        ? supabase.from("vehiculos").select("*").in("conductor_id", lista.map((o) => o.conductor_id))
        : Promise.resolve({ data: [] as FilaVehiculo[] }),
    ]);

    const conOferta: ConductorConOferta[] = [];
    for (const oferta of lista) {
      const conductor = perfiles.get(oferta.conductor_id);
      if (!conductor) continue;
      conOferta.push({
        ofertaId: oferta.id,
        precio: oferta.precio,
        creadaEn: oferta.creada_en,
        conductor,
        vehiculo: (vehiculos ?? []).find((v) => v.conductor_id === oferta.conductor_id) ?? null,
      });
    }
    return { viaje, ofertas: conOferta, conductor: null };
  }

  if (!viaje.conductor_id) return { viaje, ofertas: [], conductor: null };
  const [perfiles, contacto, vehiculo] = await Promise.all([
    perfilesPublicos([viaje.conductor_id]),
    contactoDelViaje(viaje.conductor_id),
    supabase.from("vehiculos").select("*").eq("conductor_id", viaje.conductor_id).maybeSingle(),
  ]);
  return {
    viaje,
    ofertas: [],
    conductor: {
      perfil: perfiles.get(viaje.conductor_id) ?? null,
      telefono: contacto?.telefono ?? null,
      vehiculo: vehiculo.data ?? null,
    },
  };
}

export interface ViajeDelConductor {
  viaje: FilaViaje;
  estudiante: { nombre: string; telefono: string | null } | null;
}

export async function viajeActivoDelConductor(conductorId: string): Promise<ViajeDelConductor | null> {
  const supabase = await crearClienteServidor();
  const { data: viaje } = await supabase
    .from("viajes")
    .select("*")
    .eq("conductor_id", conductorId)
    .in("estado", ["aceptado", "en_curso"])
    .maybeSingle();
  if (!viaje) return null;
  const contacto = await contactoDelViaje(viaje.estudiante_id);
  return { viaje, estudiante: contacto ? { nombre: contacto.nombre, telefono: contacto.telefono } : null };
}

export interface SolicitudAbierta {
  viaje: FilaViaje;
  estudiante: PerfilPublico | null;
  /** Mi oferta activa en este viaje, si ya oferté. */
  miOferta: FilaOferta | null;
}

/** Solicitudes que un conductor disponible puede ver y a las que puede ofertar. */
export async function solicitudesAbiertas(conductorId: string) {
  const supabase = await crearClienteServidor();
  const { data: viajes } = await supabase
    .from("viajes")
    .select("*")
    .eq("estado", "solicitado")
    .order("creado_en", { ascending: false })
    .limit(30);
  const lista = viajes ?? [];

  const [perfiles, ofertas] = await Promise.all([
    perfilesPublicos(lista.map((v) => v.estudiante_id)),
    lista.length
      ? supabase.from("ofertas").select("*").eq("conductor_id", conductorId).eq("estado", "activa").in("viaje_id", lista.map((v) => v.id))
      : Promise.resolve({ data: [] as FilaOferta[] }),
  ]);

  const solicitudes: SolicitudAbierta[] = lista.map((viaje) => ({
    viaje,
    estudiante: perfiles.get(viaje.estudiante_id) ?? null,
    miOferta: (ofertas.data ?? []).find((o) => o.viaje_id === viaje.id) ?? null,
  }));
  return { solicitudes, ahora: Date.now() };
}

/** Una solicitud concreta para ofertar (null si ya no está disponible para mí). */
export async function solicitudParaOfertar(viajeId: string, conductorId: string) {
  const { solicitudes } = await solicitudesAbiertas(conductorId);
  return solicitudes.find((s) => s.viaje.id === viajeId) ?? null;
}

export async function vehiculoDe(conductorId: string): Promise<FilaVehiculo | null> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("vehiculos").select("*").eq("conductor_id", conductorId).maybeSingle();
  return data;
}

export interface ResumenConductor {
  viajesEstaSemana: number;
  calificacion: number | null;
  totalCalificaciones: number;
}

export async function resumenDelConductor(conductorId: string): Promise<ResumenConductor> {
  const supabase = await crearClienteServidor();
  const desde = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const [semana, perfiles] = await Promise.all([
    supabase
      .from("viajes")
      .select("id", { count: "exact", head: true })
      .eq("conductor_id", conductorId)
      .eq("estado", "terminado")
      .gte("terminado_en", desde),
    perfilesPublicos([conductorId]),
  ]);
  const yo = perfiles.get(conductorId);
  return {
    viajesEstaSemana: semana.count ?? 0,
    calificacion: yo && yo.total_calificaciones > 0 ? yo.calificacion : null,
    totalCalificaciones: yo?.total_calificaciones ?? 0,
  };
}

export interface ItemHistorial {
  viaje: FilaViaje;
  /** La otra persona del viaje (nombre), si se puede ver. */
  otraPersona: string | null;
  /** Ya califiqué este viaje. */
  calificado: boolean;
}

export async function historialDeViajes(usuarioId: string): Promise<ItemHistorial[]> {
  const supabase = await crearClienteServidor();
  const { data: viajes } = await supabase
    .from("viajes")
    .select("*")
    .or(`estudiante_id.eq.${usuarioId},conductor_id.eq.${usuarioId}`)
    .in("estado", ["terminado", "cancelado"])
    .order("creado_en", { ascending: false })
    .limit(30);
  const lista = viajes ?? [];
  if (lista.length === 0) return [];

  const otros = lista.map((v) => (v.estudiante_id === usuarioId ? v.conductor_id : v.estudiante_id)).filter((id): id is string => !!id);
  const [perfiles, calificaciones] = await Promise.all([
    perfilesPublicos(otros),
    supabase.from("calificaciones").select("viaje_id").eq("autor_id", usuarioId).in("viaje_id", lista.map((v) => v.id)),
  ]);
  const calificados = new Set((calificaciones.data ?? []).map((c) => c.viaje_id));

  return lista.map((viaje) => {
    const otroId = viaje.estudiante_id === usuarioId ? viaje.conductor_id : viaje.estudiante_id;
    return { viaje, otraPersona: otroId ? (perfiles.get(otroId)?.nombre ?? null) : null, calificado: calificados.has(viaje.id) };
  });
}

/** Datos para la pantalla de calificar: el viaje terminado y a quién se califica. */
export async function viajeParaCalificar(viajeId: string, usuarioId: string) {
  const supabase = await crearClienteServidor();
  const { data: viaje } = await supabase.from("viajes").select("*").eq("id", viajeId).eq("estado", "terminado").maybeSingle();
  if (!viaje || (viaje.estudiante_id !== usuarioId && viaje.conductor_id !== usuarioId)) return null;

  const otroId = viaje.estudiante_id === usuarioId ? viaje.conductor_id : viaje.estudiante_id;
  const [perfiles, previa] = await Promise.all([
    perfilesPublicos(otroId ? [otroId] : []),
    supabase.from("calificaciones").select("id").eq("viaje_id", viajeId).eq("autor_id", usuarioId).maybeSingle(),
  ]);
  return { viaje, otro: otroId ? (perfiles.get(otroId) ?? null) : null, yaCalifique: !!previa.data };
}

/** Sede de la universidad de la persona: es el destino de todos los viajes (por ahora). */
export async function sedeDeUniversidad(universidadId: number) {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("universidades").select("nombre, lat, lng").eq("id", universidadId).single();
  return data;
}
