import { cambiarModo } from "@/app/lib/acciones-perfil";
import { BotonAccion } from "./boton-accion";

// Pasa de estudiante a conductor o al revés con la misma cuenta. Si hay un
// viaje en marcha, la base lo rechaza y el botón muestra el motivo.
export function BotonCambiarModo({ modoActual, ancho }: { modoActual: "estudiante" | "conductor"; ancho?: boolean }) {
  const destino = modoActual === "estudiante" ? "conductor" : "estudiante";
  return (
    <BotonAccion
      accion={cambiarModo}
      campos={{ rol: destino }}
      estilo={ancho ? "borde" : "pequenoBorde"}
      enviando="Cambiando…"
    >
      {destino === "conductor" ? "Cambiar a conductor" : "Cambiar a estudiante"}
    </BotonAccion>
  );
}
