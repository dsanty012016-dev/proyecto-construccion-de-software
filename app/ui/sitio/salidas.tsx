import { pesos } from "@/app/lib/formato";
import { MINUTOS_LIMITE_PAGO } from "@/app/lib/pagos";

// Cupos: el conductor publica a qué hora sale y los estudiantes piden puesto.
// Se muestra como un tablero de salidas, siempre en oscuro.

const SALIDAS = [
  { hora: "6:30", nombre: "Andrés R.", sale: "Sale de La Esperanza", precio: 5000, libres: 2 },
  { hora: "6:45", nombre: "Laura M.", sale: "Sale de El Buque", precio: 4500, libres: 3 },
  { hora: "6:50", nombre: "Sara G.", sale: "Sale de Porfía, en moto", precio: 6000, libres: 1 },
  { hora: "7:10", nombre: "Camilo P.", sale: "Sale del Centro", precio: 5000, libres: 0 },
];

export function Salidas() {
  return (
    <section className="tramo" aria-labelledby="titulo-cupos">
      <div className="marco salidas">
        <div className="salidas-texto">
          <h2 id="titulo-cupos" className="cartel">
            ¿Vas con tiempo? Súbete en el camino.
          </h2>
          <p className="entradilla">
            Hay conductores que publican a qué hora salen hacia la U. Pides tu puesto desde un punto de su recorrido, el conductor lo aprueba y pagas
            hasta {MINUTOS_LIMITE_PAGO} minutos antes de salir.
          </p>
        </div>
        {/* Dibujo de ejemplo: el texto de al lado ya lo explica. */}
        <div className="tablero" data-tema="oscuro" aria-hidden="true">
          <p className="tablero-titulo">
            <span>Mañana, salidas hacia la U</span>
            <span>Puestos</span>
          </p>
          {SALIDAS.map((salida) => (
            <div key={salida.hora} className={salida.libres === 0 ? "salida llena" : "salida"}>
              <span className="hora">{salida.hora}</span>
              <div>
                <b>{salida.nombre}</b>
                <small>{salida.sale}</small>
              </div>
              {salida.libres === 0 ? (
                <span className="precio">Lleno</span>
              ) : (
                <span className="precio">
                  {pesos(salida.precio)}
                  <small>{salida.libres === 1 ? "1 libre" : `${salida.libres} libres`}</small>
                </span>
              )}
            </div>
          ))}
          <p className="tablero-nota">Salidas de ejemplo</p>
        </div>
      </div>
    </section>
  );
}
