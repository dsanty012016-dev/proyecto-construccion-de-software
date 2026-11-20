import { comision, gananciaConductor, PORCENTAJE_COMISION } from "@/app/lib/comision";
import { pesos } from "@/app/lib/formato";
import { COBRO_CANCELACION_VIAJE, diasDeSuspension, STRIKES_PARA_SUSPENDER } from "@/app/lib/pagos";
import { DOMINIO_INSTITUCIONAL } from "@/app/lib/validaciones-auth";

// Seguridad y precios, contados con piezas de un plano: las reglas son la
// leyenda (cada símbolo, una regla) y el reparto de un viaje es la barra de
// escala. Cada regla es algo que la base de datos hace cumplir de verdad
// (supabase/migraciones 002, 011, 012 y 013) y los números salen de app/lib
// para que no se desactualicen. Si cambia una regla, cambia este texto.

const PRECIO_EJEMPLO = 7000;

const NUMEROS = ["cero", "un", "dos", "tres", "cuatro", "cinco"];

// Trazos de los símbolos de la leyenda (íconos de línea, 30 × 30).
const SIMBOLOS = {
  correo: <><rect x="4" y="8" width="22" height="15" rx="2" /><path d="m5 10 10 7 10-7" /></>,
  escudo: <><path d="M15 4 6 8v6c0 6 4 10 9 12 5-2 9-6 9-12V8l-9-4Z" /><path d="m11 15 3 3 5-6" /></>,
  celular: <><rect x="9" y="4" width="12" height="22" rx="2.5" /><path d="M13 22h4" /></>,
  envivo: <><circle cx="15" cy="15" r="3" fill="currentColor" /><path d="M8.5 8.5a9 9 0 0 0 0 13M21.5 8.5a9 9 0 0 1 0 13" /></>,
  billetera: <><rect x="4" y="9" width="22" height="14" rx="2" /><path d="M4 13h22M19 18h3" /></>,
  devolver: <><path d="M8 15a7 7 0 1 0 2-5" /><path d="M8 6v4h4" /></>,
  porcentaje: <><circle cx="15" cy="15" r="10" /><path d="M11 19 19 11M11.5 12h.01M18.5 18h.01" strokeWidth={2.6} /></>,
  bandera: <><path d="M7 26V5" /><path d="M7 6h15l-3 5 3 5H7" /></>,
  strikes: <path d="M8 7v16M15 7v16M22 7v16" />,
};

const REGLAS: { simbolo: keyof typeof SIMBOLOS; titulo: string; texto: string }[] = [
  { simbolo: "correo", titulo: "Solo gente de la U", texto: `Para crear cuenta necesitas tu correo @${DOMINIO_INSTITUCIONAL}.` },
  { simbolo: "escudo", titulo: "Conductores verificados", texto: "El equipo revisa su cédula, licencia y tarjeta de propiedad antes de su primer viaje." },
  { simbolo: "celular", titulo: "Tu número, solo durante el viaje", texto: "La otra persona ve tu teléfono únicamente mientras el viaje está activo." },
  { simbolo: "envivo", titulo: "Comparte tu viaje en vivo", texto: "Envía un enlace para que alguien de confianza vea por dónde vas. Se apaga al llegar." },
  { simbolo: "billetera", titulo: "Pagas al aceptar la oferta", texto: "El dinero queda guardado hasta que llegas a la U." },
  { simbolo: "devolver", titulo: "Si el conductor cancela", texto: "Te devolvemos todo y él suma un strike." },
  { simbolo: "porcentaje", titulo: "Si cancelas con el conductor en camino", texto: `Se cobra el ${COBRO_CANCELACION_VIAJE} % y sumas un strike.` },
  { simbolo: "bandera", titulo: "Si algo raro pasa, no pagas", texto: "Cancelas reportando al conductor y te devolvemos todo. El equipo revisa el reporte." },
  {
    simbolo: "strikes",
    titulo: `A los ${NUMEROS[STRIKES_PARA_SUSPENDER] ?? STRIKES_PARA_SUSPENDER} strikes`,
    texto: `Suspensión de ${diasDeSuspension(1)} días; si se repite, ${diasDeSuspension(2)}, ${diasDeSuspension(3)} y luego ${diasDeSuspension(4)}.`,
  },
];

export function Leyenda() {
  return (
    <section className="tramo-plano a-lo-ancho" id="seguridad" data-foco="u" data-lado="ancho" aria-labelledby="titulo-leyenda">
      <div className="rotulo">
        <div className="leyenda-cabeza">
          <h2 id="titulo-leyenda" className="cartel">
            Leyenda
          </h2>
          <p>Tu seguridad la cuida el sistema, no la buena voluntad.</p>
        </div>
        <ul className="leyenda">
          {REGLAS.map((regla) => (
            <li key={regla.titulo}>
              <svg viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {SIMBOLOS[regla.simbolo]}
              </svg>
              <b>{regla.titulo}</b>
              <span>{regla.texto}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Cuentas() {
  const conductor = 100 - PORCENTAJE_COMISION;
  return (
    <section className="tramo-plano a-la-derecha" id="precios" data-foco="ruta" data-lado="derecha" data-ruta="Barzal" aria-labelledby="titulo-cuentas">
      <div className="rotulo">
        <h2 id="titulo-cuentas" className="cartel">
          Lo que cuesta, sin letra chiquita.
        </h2>
        <p className="entradilla">Pagas con el saldo de tu billetera UniGo. Así cada peso queda registrado y nadie discute en efectivo.</p>
        <figure className="escala">
          <div className="escala-barra" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => (
              <i key={i} className={i < conductor / 10 ? "" : "comision"} />
            ))}
          </div>
          <dl className="escala-marcas">
            <div>
              <dt>Para Andrés, el {conductor} %</dt>
              <dd className="cifra">{pesos(gananciaConductor(PRECIO_EJEMPLO))}</dd>
            </div>
            <div>
              <dt>UniGo, {PORCENTAJE_COMISION} %</dt>
              <dd className="cifra">{pesos(comision(PRECIO_EJEMPLO))}</dd>
            </div>
          </dl>
          <figcaption className="escala-total">
            <span>
              Tú pagas <small>viaje de ejemplo, de Barzal a la U</small>
            </span>
            <b className="cifra">{pesos(PRECIO_EJEMPLO)}</b>
          </figcaption>
        </figure>
        <p className="nota-chica">Durante el piloto, la billetera funciona con saldo de prueba: todavía no se cobra dinero real.</p>
      </div>
    </section>
  );
}
