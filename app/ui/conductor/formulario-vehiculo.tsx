"use client";

import { useActionState } from "react";
import { guardarVehiculo } from "@/app/lib/acciones-viaje";
import { ESTADO_INICIAL } from "@/app/lib/estado-formulario";
import type { FilaVehiculo } from "@/app/lib/consultas-viaje";
import { Aviso, BotonEnviar, Campo } from "@/app/ui/auth/campos";

// Registro o edición del vehículo del conductor (uno por conductor).
export function FormularioVehiculo({ vehiculo }: { vehiculo: FilaVehiculo | null }) {
  const [estado, accion] = useActionState(guardarVehiculo, ESTADO_INICIAL);
  const errores = estado.errores ?? {};
  const valores = estado.valores ?? {};
  return (
    <form action={accion} className="space-y-4" noValidate>
      {estado.resultado === "error" && estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}
      {estado.resultado === "listo" && <Aviso tipo="listo">{estado.mensaje}</Aviso>}
      <Campo
        etiqueta="Placa"
        name="placa"
        placeholder="ABC123 o ABC12D"
        defaultValue={valores.placa ?? vehiculo?.placa}
        error={errores.placa}
        maxLength={8}
        autoCapitalize="characters"
        autoComplete="off"
      />
      <Campo etiqueta="Marca" name="marca" placeholder="Chevrolet" defaultValue={valores.marca ?? vehiculo?.marca} error={errores.marca} maxLength={40} />
      <Campo etiqueta="Modelo" name="modelo" placeholder="Spark" defaultValue={valores.modelo ?? vehiculo?.modelo} error={errores.modelo} maxLength={40} />
      <Campo etiqueta="Color" name="color" placeholder="Gris" defaultValue={valores.color ?? vehiculo?.color} error={errores.color} maxLength={30} />
      <BotonEnviar enviando="Guardando…">{vehiculo ? "Guardar cambios" : "Registrar vehículo"}</BotonEnviar>
    </form>
  );
}
