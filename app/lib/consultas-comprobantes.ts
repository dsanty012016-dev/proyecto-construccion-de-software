import "server-only";
import { gananciaConductor } from "./comision";
import type { FilaMovimiento } from "./consultas-billetera";
import { cancelacionDeViaje, COBRO_CUPO_TARDE } from "./pagos";
import { recorridoDelPuesto } from "./sentido";
import { crearClienteServidor } from "./supabase/server";

export async function comprobanteDeViaje(id: string, persona: string) {
  const supabase = await crearClienteServidor();
  const { data: viaje } = await supabase.from("viajes")
    .select("estudiante_id,conductor_id,origen_texto,destino_texto,estado,vencio,creado_en,terminado_en,cancelado_en,precio")
    .eq("id", id).or(`estudiante_id.eq.${persona},conductor_id.eq.${persona}`).maybeSingle().throwOnError();
  if (!viaje) return null;
  const { data: movimientos } = await supabase.from("movimientos").select("*")
    .eq("persona_id", persona).eq("viaje_id", id).order("creado_en").order("id").throwOnError();
  const bruto = viaje.estado === "cancelado" && viaje.precio !== null
    ? cancelacionDeViaje(viaje.precio).cobro
    : viaje.precio;
  return { viaje, movimientos: movimientos ?? [], comision: comisionRegistrada(movimientos ?? [], bruto === null ? [] : [bruto]) };
}

export async function comprobanteDeCupo(id: string, persona: string) {
  const supabase = await crearClienteServidor();
  const { data: cupo } = await supabase.from("cupos")
    .select("id,conductor_id,salida_texto,destino_texto,sentido,sale_en,estado,vencio,precio").eq("id", id)
    .maybeSingle().throwOnError();
  if (!cupo) return null;
  const soyConductor = cupo.conductor_id === persona;
  const consulta = supabase.from("puestos").select("id,recogida_texto").eq("cupo_id", id);
  const { data: puestos } = await (soyConductor ? consulta : consulta.eq("estudiante_id", persona)).throwOnError();
  if (!soyConductor && !puestos?.length) return null;
  const idsPuestos = (puestos ?? []).map((p) => p.id);
  const movimientos = idsPuestos.length
    ? (await supabase.from("movimientos").select("*").eq("persona_id", persona)
      .in("puesto_id", idsPuestos).order("creado_en").order("id").throwOnError()).data ?? []
    : [];
  const ruta = soyConductor
    ? { origen: cupo.salida_texto, destino: cupo.destino_texto }
    : recorridoDelPuesto(cupo, puestos?.[0]?.recogida_texto ?? null);
  const compensacion = Math.round(cupo.precio * COBRO_CUPO_TARDE / 100);
  return { cupo, ruta, movimientos, comision: comisionRegistrada(movimientos, [cupo.precio, compensacion]) };
}

// Solo muestra la comisión cuando la ganancia registrada coincide con la tarifa aplicada.
function comisionRegistrada(movimientos: FilaMovimiento[], importes: number[]) {
  return movimientos.reduce((total, movimiento) => {
    if (movimiento.tipo !== "ganancia") return total;
    const bruto = importes.find((importe) => gananciaConductor(importe) === movimiento.monto);
    return bruto === undefined ? total : total + bruto - movimiento.monto;
  }, 0);
}

/** Resuelve los cupos de los movimientos propios ya visibles en la billetera. */
export async function cuposDeMovimientos(movimientos: FilaMovimiento[]) {
  const ids = [...new Set(movimientos.flatMap((m) => m.puesto_id ? [m.puesto_id] : []))];
  if (!ids.length) return new Map<string, string>();
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("puestos").select("id,cupo_id").in("id", ids).throwOnError();
  return new Map((data ?? []).map((p) => [p.id, p.cupo_id]));
}
