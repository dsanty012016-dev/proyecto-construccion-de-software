import { PedirPortada } from "./pedir-portada";

// Primera pantalla: el plano real de Villavicencio de fondo (plano-portada.tsx)
// y, encima, el rótulo con el mensaje que todos hemos mandado al grupo y la
// primera acción: elegir de dónde sales para ver tu ruta hasta la U.
export function Portada() {
  return (
    <section className="tramo-plano" data-foco="ruta" data-lado="izquierda" aria-labelledby="titulo-portada">
      <div className="rotulo rotulo-portada">
        <h1 id="titulo-portada" className="cartel">
          ¿Alguien va pa’ la U?
        </h1>
        <p className="entradilla">Conductores que también estudian en la Santo Tomás te ofrecen su precio y tú eliges con quién te vas.</p>
        <PedirPortada />
      </div>
    </section>
  );
}
