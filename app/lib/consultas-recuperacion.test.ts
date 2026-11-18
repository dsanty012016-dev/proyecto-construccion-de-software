import { createClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
const dobles = vi.hoisted(() => ({ cliente: null as unknown as ReturnType<typeof createClient> }));
vi.mock("server-only", () => ({}));
vi.mock("./supabase/server", () => ({ crearClienteServidor: async () => dobles.cliente }));
import * as viajes from "./consultas-viaje";
import * as cupos from "./consultas-cupo";
import * as documentos from "./consultas-verificacion";

// Se usa el cliente real con respuestas HTTP locales: prueba que un fallo de
// la API no se transforma en ausencia de registros en las lecturas de la app.
const id = "a532a445-1dc5-4e52-b715-134ef6719da0";
let tablas: Record<string, unknown>;
let falla: string;
let sinRed: boolean;
beforeEach(() => {
  tablas = {}; falla = ""; sinRed = false;
  dobles.cliente = createClient("https://datos-ficticios.invalid", "credencial-ficticia", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, opciones) => {
      if (sinRed) throw new Error("Conexión interrumpida simulada");
      const ruta = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url).pathname;
      const tabla = ruta.startsWith("/storage/") ? "enlaces" : ruta.split("/").at(-1)!;
      const error = tabla === falla;
      return new Response(opciones?.method === "HEAD" ? null : JSON.stringify(error ? { message: "Consulta fallida simulada", code: "42501", error: "Consulta fallida simulada" } : tablas[tabla] ?? []), {
        status: error ? 400 : 200, headers: { "Content-Type": "application/json", "Content-Range": "0-0/0" },
      });
    } },
  });
});
const principales = [
  ["viaje del estudiante", "viajes", () => viajes.viajeActivoDelEstudiante(id)],
  ["viaje del conductor", "viajes", () => viajes.viajeActivoDelConductor(id)],
  ["solicitudes", "viajes", () => viajes.solicitudesAbiertas(id)],
  ["historial de viajes", "viajes", () => viajes.historialDeViajes(id)],
  ["vehículo", "vehiculos", () => viajes.vehiculoDe(id)],
  ["perfiles públicos", "perfiles_publicos", () => viajes.perfilesPublicos([id])],
  ["cupo del conductor", "cupos", () => cupos.cupoActivoDelConductor(id)],
  ["cupos disponibles", "cupos", () => cupos.cuposDisponibles()],
  ["detalle del cupo", "cupos", () => cupos.cupoParaEstudiante(id, id)],
  ["puesto actual", "puestos", () => cupos.puestoActivoDelEstudiante(id)],
  ["historial de cupos", "cupos", () => cupos.historialDeCupos(id)],
  ["documentos propios", "documentos_conductor", () => documentos.misDocumentos(id)],
  ["verificación", "documentos_conductor", () => documentos.estoyVerificado(id)],
  ["documentos para revisar", "documentos_conductor", () => documentos.conductoresPorRevisar()],
] as const;
describe("consultas fallidas frente a resultados vacíos", () => {
  it.each(principales)("%s informa el fallo", async (_nombre, tabla, consultar) => {
    falla = tabla; await expect(consultar()).rejects.toMatchObject({ message: "Consulta fallida simulada" });
  });
  it("sin red tampoco inventa una lista vacía", async () => {
    vi.useFakeTimers();
    try {
      sinRed = true;
      const fallo = expect(viajes.solicitudesAbiertas(id)).rejects.toThrow();
      await vi.runAllTimersAsync();
      await fallo;
    } finally { vi.useRealTimers(); }
  });
  it("cero registros sigue siendo un vacío legítimo", async () => {
    expect(await viajes.viajeActivoDelEstudiante(id)).toBeNull();
    expect(await viajes.solicitudesAbiertas(id)).toMatchObject({ solicitudes: [] });
    expect(await cupos.cuposDisponibles()).toMatchObject({ cupos: [] });
    expect(await documentos.misDocumentos(id)).toEqual({});
    expect(await documentos.estoyVerificado(id)).toBe(false);
  });
  it("una oferta que no pudo consultarse no parece ausencia de ofertas", async () => {
    tablas.viajes = [{ id, estado: "solicitado" }]; falla = "ofertas";
    await expect(viajes.viajeActivoDelEstudiante(id)).rejects.toMatchObject({ message: "Consulta fallida simulada" });
  });
  it("un fallo al contar puestos no parece un cupo lleno", async () => {
    tablas.cupos = [{ id, conductor_id: id }]; falla = "puestos_libres";
    await expect(cupos.cuposDisponibles()).rejects.toMatchObject({ message: "Consulta fallida simulada" });
  });
  it("un fallo de mi puesto no habilita otra solicitud por ausencia ficticia", async () => {
    tablas.cupos = [{ id, conductor_id: id }]; falla = "puestos";
    await expect(cupos.cupoParaEstudiante(id, id)).rejects.toMatchObject({ message: "Consulta fallida simulada" });
  });
  it("al volver, un puesto impagado fuera de plazo se presenta vencido", async () => {
    tablas.cupos = [{ id, conductor_id: id, sale_en: new Date(Date.now() + 60_000).toISOString() }];
    tablas.puestos = [{ id, estado: "aprobado", pagado: 0 }];
    expect((await cupos.cupoParaEstudiante(id, id))?.miPuesto?.estado).toBe("sin_pago");
  });
  it("un puesto ya pagado conserva su estado al volver", async () => {
    tablas.cupos = [{ id, conductor_id: id, sale_en: new Date(Date.now() + 60_000).toISOString() }];
    tablas.puestos = [{ id, estado: "aprobado", pagado: 6500 }];
    expect((await cupos.cupoParaEstudiante(id, id))?.miPuesto).toMatchObject({ estado: "aprobado", pagado: 6500 });
  });
  it("el fallo de contactos no oculta una llamada disponible", async () => {
    tablas.viajes = [{ id, estado: "aceptado", estudiante_id: id }]; falla = "perfiles";
    await expect(viajes.viajeActivoDelConductor(id)).rejects.toMatchObject({ message: "Consulta fallida simulada" });
  });
  it("un fallo al abrir documentos no parece un archivo que falta", async () => {
    tablas.documentos_conductor = [{ conductor_id: id, ruta: "ficticio.pdf" }]; falla = "enlaces";
    await expect(documentos.conductoresPorRevisar()).rejects.toThrow("No pudimos abrir los documentos");
  });
});
