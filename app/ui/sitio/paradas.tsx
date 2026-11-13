import { Foto } from "./foto";

// "Cómo funciona", contado como la mañana de Laura (la del mensaje de la
// portada): cuatro paradas con su hora, sobre una línea de ruta. Después, la
// franja de foto de la ciudad con el lema.

const PARADAS = [
  { hora: "6:41", titulo: "Pide su viaje", texto: "Marca en el mapa dónde la recogen. No le escribe a nadie." },
  {
    hora: "6:43",
    titulo: "Elige una oferta",
    texto: "Tres conductores le proponen precio. Ve la calificación, el carro y la placa de cada uno, y se va con Andrés.",
  },
  { hora: "6:50", titulo: "La recogen", texto: "Ve a Andrés acercarse en el mapa y le comparte el viaje en vivo a su mamá." },
  { hora: "6:58", titulo: "Llega a clase", texto: "Andrés recibe su pago, y los dos se califican." },
];

export function Paradas() {
  return (
    <section className="tramo" id="como-funciona" aria-labelledby="titulo-paradas">
      <div className="marco">
        <div className="paradas-cabeza">
          <h2 id="titulo-paradas" className="cartel">
            De Barzal a clase de siete, en cuatro paradas.
          </h2>
          <p className="entradilla">
            Así le fue a Laura, la del mensaje. Es un ejemplo, pero funciona igual desde tu barrio, y también de la U de vuelta a casa.
          </p>
        </div>
        <ol className="paradas">
          {PARADAS.map((parada) => (
            <li key={parada.hora} className="parada">
              <p className="hora">{parada.hora}</p>
              <h3>{parada.titulo}</h3>
              <p>{parada.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function FranjaCiudad() {
  return (
    <Foto className="franja-foto" alt="Una calle de Villavicencio al amanecer" falta="una calle de Villavicencio al amanecer, a todo el ancho">
      <div className="lema">
        <div className="marco">
          <p className="cartel">Aquí todos vamos pa’l mismo lado.</p>
        </div>
      </div>
    </Foto>
  );
}
