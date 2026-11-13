import { comision, gananciaConductor, PORCENTAJE_COMISION } from "@/app/lib/comision";
import { pesos } from "@/app/lib/formato";
import { COBRO_CANCELACION_VIAJE, diasDeSuspension, STRIKES_PARA_SUSPENDER } from "@/app/lib/pagos";
import { DOMINIO_INSTITUCIONAL } from "@/app/lib/validaciones-auth";

// Precios y seguridad. A la izquierda, un recibo con las cuentas de un viaje
// de ejemplo; a la derecha, las reglas. Cada regla es algo que la base de
// datos hace cumplir de verdad (supabase/migraciones 002, 011, 012 y 013) y
// los números salen de app/lib para que no se desactualicen. Si cambia una
// regla, cambia este texto.

const PRECIO_EJEMPLO = 7000;

const NUMEROS = ["cero", "un", "dos", "tres", "cuatro", "cinco"];

const REGLAS = [
  { titulo: "Solo gente de la U", texto: `Para crear cuenta necesitas tu correo @${DOMINIO_INSTITUCIONAL}.` },
  { titulo: "Conductores verificados", texto: "El equipo revisa su cédula, licencia y tarjeta de propiedad antes de su primer viaje." },
  { titulo: "Tu número, solo durante el viaje", texto: "La otra persona ve tu teléfono únicamente mientras el viaje está activo." },
  { titulo: "Comparte tu viaje en vivo", texto: "Envía un enlace para que alguien de confianza vea por dónde vas. Se apaga al llegar." },
  { titulo: "Pagas al aceptar la oferta", texto: "El dinero queda guardado hasta que llegas a la U." },
  { titulo: "Si el conductor cancela", texto: "Te devolvemos todo y él suma un strike." },
  { titulo: "Si cancelas con el conductor en camino", texto: `Se cobra el ${COBRO_CANCELACION_VIAJE} % y sumas un strike.` },
  { titulo: "Si algo raro pasa, no pagas", texto: "Cancelas reportando al conductor y te devolvemos todo. El equipo revisa el reporte." },
  {
    titulo: `A los ${NUMEROS[STRIKES_PARA_SUSPENDER] ?? STRIKES_PARA_SUSPENDER} strikes`,
    texto: `Suspensión de ${diasDeSuspension(1)} días; si se repite, ${diasDeSuspension(2)}, ${diasDeSuspension(3)} y luego ${diasDeSuspension(4)}.`,
  },
];

export function Cuentas() {
  return (
    <section className="tramo" id="precios" aria-labelledby="titulo-cuentas">
      <div className="marco cuentas">
        <div className="cuentas-izq">
          <div className="cuentas-cabeza">
            <h2 id="titulo-cuentas" className="cartel">
              Lo que cuesta, sin letra chiquita.
            </h2>
            <p className="entradilla">
              Pagas con el saldo de tu billetera UniGo. Así cada peso queda registrado y nadie discute en efectivo.
            </p>
          </div>
          {/* El recibo va siempre en papel blanco. */}
          <div className="recibo" data-tema="claro">
            <h3>Recibo de viaje</h3>
            <p className="tramo-viaje">De Barzal a la U, con Andrés R.</p>
            <dl>
              <div className="renglon">
                <dt>Para Andrés, el {100 - PORCENTAJE_COMISION} %</dt>
                <dd>{pesos(gananciaConductor(PRECIO_EJEMPLO))}</dd>
              </div>
              <div className="renglon">
                <dt>Para UniGo, el {PORCENTAJE_COMISION} %</dt>
                <dd>{pesos(comision(PRECIO_EJEMPLO))}</dd>
              </div>
              <div className="renglon total">
                <dt>Tú pagas</dt>
                <dd>{pesos(PRECIO_EJEMPLO)}</dd>
              </div>
            </dl>
            <p>Durante el piloto, la billetera funciona con saldo de prueba: todavía no se cobra dinero real.</p>
          </div>
        </div>
        <div id="seguridad">
          <p className="frase frase-suelta">Tu seguridad la cuida el sistema, no la buena voluntad.</p>
          <ul className="reglas">
            {REGLAS.map((regla) => (
              <li key={regla.titulo}>
                <b>{regla.titulo}</b>
                <span>{regla.texto}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
