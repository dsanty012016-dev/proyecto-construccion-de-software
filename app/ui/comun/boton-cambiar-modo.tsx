import { cambiarModo } from "@/app/lib/acciones-perfil";
import { BotonAccion } from "./boton-accion";
import { IconoCambiar } from "./iconos-app";

// Pasa de estudiante a conductor o al revés con la misma cuenta. Muestra el
// modo actual (como en el rediseño) y dice a cuál cambia para lectores de
// pantalla. Si hay un viaje en marcha, la base lo rechaza y se ve el motivo.
export function BotonCambiarModo({ modoActual, ancho }: { modoActual: "estudiante" | "conductor"; ancho?: boolean }) {
  const destino = modoActual === "estudiante" ? "conductor" : "estudiante";
  if (ancho) {
    return (
      <BotonAccion accion={cambiarModo} campos={{ rol: destino }} estilo="borde" enviando="Cambiando…">
        {destino === "conductor" ? "Cambiar a conductor" : "Cambiar a estudiante"}
      </BotonAccion>
    );
  }
  return (
    <BotonAccion
      accion={cambiarModo}
      campos={{ rol: destino }}
      estilo="pastilla"
      enviando="Cambiando…"
      etiqueta={`Modo ${modoActual}. Cambiar a modo ${destino}`}
    >
      <IconoCambiar className="size-[18px] text-texto-suave" />
      {modoActual === "estudiante" ? "Estudiante" : "Conductor"}
    </BotonAccion>
  );
}
