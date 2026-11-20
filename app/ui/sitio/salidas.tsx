import { pesos } from "@/app/lib/formato";
import { MINUTOS_LIMITE_PAGO } from "@/app/lib/pagos";
import { SALIDAS_EJEMPLO } from "./plano-datos";

// Cupos: el conductor publica a qué hora sale y los estudiantes piden puesto.
// El plano de atrás marca de dónde sale cada uno y su recorrido real hasta la U.
export function Salidas() {
  return (
    <section className="tramo-plano" id="cupos" data-foco="cupos" data-lado="izquierda" data-capa="cupos" aria-labelledby="titulo-cupos">
      <div className="rotulo">
        <h2 id="titulo-cupos" className="cartel">
          ¿Vas con tiempo? Súbete en el camino.
        </h2>
        <p className="entradilla">
          Hay conductores que publican a qué hora salen hacia la U. Pides tu puesto desde un punto de su recorrido, el conductor lo aprueba y pagas hasta{" "}
          {MINUTOS_LIMITE_PAGO} minutos antes de salir.
        </p>
        <ul className="salidas" aria-label="Salidas de ejemplo hacia la U">
          {SALIDAS_EJEMPLO.map((salida) => (
            <li key={salida.hora} className={salida.libres === 0 ? "llena" : undefined}>
              <span className="cifra">{salida.hora}</span>
              <span>
                {salida.nombre}
                <small>
                  Sale de {salida.barrio}
                  {salida.detalle}
                </small>
              </span>
              {salida.libres === 0 ? (
                <b>Lleno</b>
              ) : (
                <b>
                  {pesos(salida.precio)}
                  <small>{salida.libres === 1 ? "1 libre" : `${salida.libres} libres`}</small>
                </b>
              )}
            </li>
          ))}
        </ul>
        <p className="nota-chica">Salidas de ejemplo</p>
      </div>
    </section>
  );
}
