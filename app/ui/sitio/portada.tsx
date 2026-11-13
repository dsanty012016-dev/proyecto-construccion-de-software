import Link from "next/link";
import { pesos } from "@/app/lib/formato";
import { DOMINIO_INSTITUCIONAL } from "@/app/lib/validaciones-auth";

// Primera pantalla de la portada. El titular es el mensaje que todos hemos
// mandado al grupo ("¿Alguien va pa' la U?"), con su hora y sus dos chulos;
// al lado, el tiquete con lo que pasa en UniGo: llegan ofertas y tú eliges.
// Abajo, la tabla de ruta como la del parabrisas de una buseta.

const OFERTAS = [
  { nombre: "Andrés R.", detalle: "4,9 de calificación, Spark gris", precio: 7000 },
  { nombre: "Valentina C.", detalle: "Nueva en UniGo, Logan blanco", precio: 7500 },
  { nombre: "Julián M.", detalle: "4,7 de calificación, en moto", precio: 9000 },
];

const BARRIOS = ["Porfía", "Barzal", "Centro", "La Esperanza", "El Buque", "Siete de Agosto", "La Grama", "Caudal", "Villa Julia"];

export function Portada() {
  const elegida = OFERTAS[0];
  return (
    <section className="portada" aria-labelledby="titulo-portada">
      <div className="marco">
        <h1 id="titulo-portada" className="cartel">
          <span>¿Alguien va</span> <span>pa’ la U?</span>
        </h1>
        <p className="enviado">
          <svg aria-hidden="true" viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M1.5 8.5l4 4 8-9.5" />
            <path d="M9.5 11.5l1.5 1.5 8-9.5" />
          </svg>
          Enviado al grupo a las 6:41 a. m.
        </p>
        <div className="portada-texto">
          <p className="frase">Todos lo leen. Nadie contesta.</p>
          <p className="entradilla">
            En UniGo, conductores que también estudian en la Santo Tomás te ofrecen su precio y tú eliges con quién te vas.
          </p>
          <div className="acciones">
            <Link href="/registro" className="boton boton-lleno">
              Crear mi cuenta
            </Link>
            <Link href="/#conducir" className="boton boton-borde">
              Quiero conducir
            </Link>
          </div>
          <p className="correo">
            Solo con tu correo <strong>@{DOMINIO_INSTITUCIONAL}</strong>
          </p>
        </div>

        {/* Es un dibujo de ejemplo: el texto de al lado ya lo explica, así que
            el lector de pantalla se lo salta. Siempre va en papel blanco. */}
        <div className="tiquete" data-tema="claro" aria-hidden="true">
          <div className="tiquete-cabeza">
            <b>{OFERTAS.length} ofertas</b>
            <span>
              De Barzal a la U
              <br />
              6:43 a. m.
            </span>
          </div>
          {OFERTAS.map((oferta) => (
            <div key={oferta.nombre} className={oferta === elegida ? "oferta elegida" : "oferta"}>
              <div>
                <b>{oferta.nombre}</b>
                <small>{oferta.detalle}</small>
              </div>
              <span className="precio">{pesos(oferta.precio)}</span>
            </div>
          ))}
          <div className="tiquete-pie">Irme con Andrés por {pesos(elegida.precio)}</div>
          <p className="tiquete-nota">Ofertas de ejemplo</p>
        </div>
      </div>

      <div className="tabla-ruta" role="img" aria-label={`De tu barrio a la U: ${BARRIOS.join(", ")}.`}>
        <ul aria-hidden="true">
          {BARRIOS.map((barrio) => (
            <li key={barrio}>{barrio}</li>
          ))}
          <li>
            <span className="destino">La U</span>
          </li>
        </ul>
      </div>
    </section>
  );
}
