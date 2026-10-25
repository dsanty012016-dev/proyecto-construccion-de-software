import { PORCENTAJE_COMISION } from "@/app/lib/comision";
import {
  COBRO_CANCELACION_VIAJE,
  COBRO_CUPO_TARDE,
  MINUTOS_CUPO_SIN_COBRO,
  diasDeSuspension,
  MINUTOS_LIMITE_PAGO,
  STRIKES_PARA_SUSPENDER,
} from "@/app/lib/pagos";
import { DOMINIO_INSTITUCIONAL } from "@/app/lib/validaciones-auth";
import { AIRE, SECCION, TITULO_SECCION } from "./estilos";

// Seguridad y precios. Cada línea es una regla que la base de datos hace
// cumplir de verdad (supabase/migraciones 002, 011, 012 y 013); los números
// salen de app/lib para que no se desactualicen. Si cambia una regla, cambia
// este texto.

const SEGURIDAD = [
  { titulo: "Solo la comunidad de la U", texto: `Para crear cuenta necesitas tu correo @${DOMINIO_INSTITUCIONAL}.` },
  { titulo: "Conductores verificados", texto: "El equipo revisa su cédula, licencia y tarjeta de propiedad antes de su primer viaje." },
  { titulo: "Tu número, solo durante el viaje", texto: "La otra persona ve tu teléfono únicamente mientras el viaje está activo." },
  { titulo: "Comparte tu viaje en vivo", texto: "Envía un enlace para que alguien de confianza vea por dónde vas. Se apaga al llegar." },
  { titulo: "Si algo raro pasa, no pagas", texto: "Cancelas reportando al conductor y te devolvemos todo. El equipo revisa el reporte." },
];

const PRECIOS = [
  { titulo: "Pagas al aceptar la oferta", texto: "El dinero queda guardado hasta que llegas a la U." },
  { titulo: `El conductor recibe el ${100 - PORCENTAJE_COMISION} %`, texto: `UniGo se queda con el ${PORCENTAJE_COMISION} % de cada viaje.` },
  { titulo: "Si cancelas con el conductor en camino", texto: `Se cobra el ${COBRO_CANCELACION_VIAJE} % y sumas un strike.` },
  { titulo: "Si el conductor cancela", texto: "Te devolvemos todo y él suma un strike." },
  {
    titulo: "Cupos con hora fija",
    texto: `Pagas hasta ${MINUTOS_LIMITE_PAGO} minutos antes. Si te bajas con menos de ${MINUTOS_CUPO_SIN_COBRO} minutos, se cobra el ${COBRO_CUPO_TARDE} %.`,
  },
  {
    titulo: `${STRIKES_PARA_SUSPENDER} strikes`,
    texto: `Suspensión de ${diasDeSuspension(1)} días; si se repite, ${diasDeSuspension(2)}, ${diasDeSuspension(3)} y luego ${diasDeSuspension(4)}.`,
  },
];

export function Seguridad() {
  return (
    <section id="seguridad" aria-labelledby="titulo-seguridad" className={`px-5 ${AIRE}`}>
      <div className="mx-auto flex max-w-[1200px] flex-wrap gap-x-[4.5rem] gap-y-10 rounded-[2rem] bg-primario px-[clamp(1.5rem,5vw,4.5rem)] py-[clamp(2.25rem,6vw,5rem)]">
        <h2 id="titulo-seguridad" className="min-w-0 flex-[1_1_21rem] text-[clamp(2.1rem,4.6vw,3.6rem)] leading-[1.04] font-extrabold tracking-[-0.035em] text-balance">
          Tu seguridad la cuida el sistema, no la buena voluntad.
        </h2>
        <dl className="min-w-0 flex-[1_1_26rem] border-b border-texto/30">
          {SEGURIDAD.map((g) => (
            <div key={g.titulo} className="border-t border-texto/30 py-[18px]">
              <dt className="font-titulo text-[19px] font-bold">{g.titulo}</dt>
              <dd className="mt-1.5 leading-normal">{g.texto}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function Precios() {
  return (
    <section id="precios" aria-labelledby="titulo-precios" className={`${SECCION} ${AIRE}`}>
      <h2 id="titulo-precios" className={`max-w-[18ch] ${TITULO_SECCION}`}>
        Lo que cuesta, sin letra chiquita.
      </h2>
      <p className="mt-5 max-w-[56ch] text-lg leading-relaxed text-texto-suave">
        Pagas con el saldo de tu billetera UniGo. Así cada peso queda registrado y nadie discute en efectivo.
      </p>
      <dl className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(min(100%,21rem),1fr))] gap-x-12">
        {PRECIOS.map((p) => (
          <div key={p.titulo} className="border-t border-texto-suave/20 py-5">
            <dt className="font-titulo text-lg font-bold">{p.titulo}</dt>
            <dd className="mt-1.5 leading-normal text-texto-suave">{p.texto}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-7 rounded-2xl bg-superficie px-[18px] py-4 leading-normal">
        Durante el piloto, la billetera funciona con <strong>saldo de prueba</strong>: todavía no se cobra dinero real.
      </p>
    </section>
  );
}
