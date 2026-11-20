// "Cómo funciona", contado como la mañana de Laura en cuatro paradas. El
// plano de atrás muestra su ruta real desde Barzal y tres ofertas de ejemplo.
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
    <section className="tramo-plano a-la-derecha" id="como-funciona" data-foco="ruta" data-lado="derecha" data-ruta="Barzal" data-capa="ofertas" aria-labelledby="titulo-paradas">
      <div className="rotulo">
        <h2 id="titulo-paradas" className="cartel">
          De Barzal a clase de siete, en cuatro paradas.
        </h2>
        <p className="entradilla">Este ejemplo sigue el viaje de Laura desde su barrio. También puedes pedir un viaje de la U a tu casa.</p>
        <ol className="paradas">
          {PARADAS.map((parada) => (
            <li key={parada.hora}>
              <span className="cifra">{parada.hora}</span>
              <b>{parada.titulo}</b>
              <span>{parada.texto}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
