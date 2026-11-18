import "server-only";
import { historialDeCupos } from "./consultas-cupo";
import { historialDeViajes } from "./consultas-viaje";
import { VIAJES_POR_PAGINA, type Filtro, type Item } from "./historial";
import { crearClienteServidor } from "./supabase/server";

export async function paginaDeViajes(persona: string, filtro: Filtro, pagina: number) {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("historial_viajes_pagina", {
    p_tipo: filtro.tipo, p_estado: filtro.estado, p_pendientes: filtro.pendientes, p_pagina: pagina,
  });
  if (error) throw new Error("No pudimos consultar el historial de viajes.");
  const referencias = data ?? [];
  const visibles = referencias.slice(0, VIAJES_POR_PAGINA);
  const [viajes, cupos] = await Promise.all([
    historialDeViajes(persona, visibles.filter((r) => r.tipo === "viaje").map((r) => r.id)),
    historialDeCupos(persona, visibles.filter((r) => r.tipo === "cupo").map((r) => r.id)),
  ]);
  const pedidos = new Map(viajes.map((v) => [v.viaje.id, v]));
  const fijos = new Map(cupos.map((c) => [c.cupo.id, c]));
  const items: Item[] = [];
  for (const referencia of visibles) {
    const fecha = Date.parse(referencia.fecha);
    if (referencia.tipo === "viaje") {
      const dato = pedidos.get(referencia.id);
      if (dato) items.push({ tipo: "viaje", fecha, dato });
    } else if (referencia.tipo === "cupo") {
      const dato = fijos.get(referencia.id);
      if (dato) items.push({ tipo: "cupo", fecha, dato });
    }
  }
  return { items, hayMas: referencias.length > VIAJES_POR_PAGINA };
}
