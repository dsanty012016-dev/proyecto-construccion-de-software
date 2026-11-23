import { NOMBRE_EXPRESION, type ExpresionUni } from "@/app/lib/mascota";

// Uni, la mascota de UniGo: el pin del logo (la U) con capucha, birrete y una
// carita que cambia según el momento (ver app/lib/mascota.ts). Es un SVG sin
// estado: los colores y el movimiento salen de ui/comun/mascota.css, con los
// tokens de la app, y se quedan quietos con prefers-reduced-motion.

const CUERPO =
  "M0 40 A41 41 0 0 1 82 40 L82 200 A75 75 0 0 0 232 200 L232 121 Q232 105 248 105 L296 105 Q312 105 312 121 L312 250 C312 298 292 328 262 353 L172 408 Q157 418 142 408 L50 353 C20 328 0 298 0 250 Z";
const ESTRELLA = "M0 -13 Q2 -2 13 0 Q2 2 0 13 Q-2 2 -13 0 Q-2 -2 0 -13 Z";

function Cara({ expresion }: { expresion: ExpresionUni }) {
  switch (expresion) {
    case "feliz":
      return (
        <>
          <path className="uni-trazo" d="M-34 -2 Q-24 -16 -14 -2" />
          <path className="uni-trazo" d="M14 -2 Q24 -16 34 -2" />
          <path className="uni-tinta" d="M-19 11 Q0 38 19 11 Z" />
        </>
      );
    case "sueno":
      return (
        <>
          <path className="uni-trazo" d="M-34 -4 Q-24 4 -14 -4" />
          <path className="uni-trazo" d="M14 -4 Q24 4 34 -4" />
          <ellipse className="uni-tinta" cx={0} cy={21} rx={5} ry={6} />
        </>
      );
    case "preocupado":
      return (
        <>
          <path className="uni-trazo" d="M-37 -22 L-15 -29" />
          <path className="uni-trazo" d="M15 -29 L37 -22" />
          <circle className="uni-tinta uni-ojo" cx={-24} cy={-4} r={7} />
          <circle className="uni-tinta uni-ojo" cx={24} cy={-4} r={7} />
          <path className="uni-trazo" d="M-16 23 Q-8 16 0 23 Q8 30 16 23" />
        </>
      );
    case "celebrando":
      return (
        <>
          <path className="uni-tinta" transform="translate(-24 -6)" d={ESTRELLA} />
          <path className="uni-tinta" transform="translate(24 -6)" d={ESTRELLA} />
          <path className="uni-tinta" d="M-18 10 Q0 36 18 10 Z" />
        </>
      );
    default:
      return (
        <>
          <ellipse className="uni-tinta uni-ojo" cx={-24} cy={-6} rx={8} ry={11} />
          <ellipse className="uni-tinta uni-ojo" cx={24} cy={-6} rx={8} ry={11} />
          <path className="uni-trazo" d="M-13 16 Q0 27 13 16" />
        </>
      );
  }
}

export function UniMascota({
  expresion = "normal",
  className = "",
  decorativa = false,
  quieta = false,
}: {
  expresion?: ExpresionUni;
  className?: string;
  /** true cuando un texto al lado ya dice lo mismo: los lectores de pantalla la saltan. */
  decorativa?: boolean;
  /** Sin el vaivén de reposo (parpadea igual), para tamaños pequeños. */
  quieta?: boolean;
}) {
  return (
    <svg
      viewBox="-40 -60 400 490"
      className={`uni-mascota uni-${expresion}${quieta ? " uni-quieta" : ""} ${className}`}
      role={decorativa ? undefined : "img"}
      aria-label={decorativa ? undefined : `Uni ${NOMBRE_EXPRESION[expresion]}`}
      aria-hidden={decorativa ? true : undefined}
      focusable="false"
    >
      <g className="uni-cuerpo">
        {expresion === "celebrando" && (
          <g className="uni-confeti">
            <rect className="uni-confeti-a" x={-24} y={30} width={16} height={9} rx={2} transform="rotate(-25 -16 34)" />
            <circle className="uni-confeti-b" cx={330} cy={150} r={7} />
            <rect className="uni-confeti-b" x={-30} y={190} width={14} height={8} rx={2} transform="rotate(30 -23 194)" />
            <circle className="uni-confeti-a" cx={340} cy={300} r={6} />
            <rect className="uni-confeti-a" x={-14} y={320} width={16} height={9} rx={2} transform="rotate(15 -6 324)" />
            <circle className="uni-confeti-b" cx={190} cy={-34} r={7} />
            <rect className="uni-confeti-a" x={40} y={-30} width={14} height={8} rx={2} transform="rotate(-35 47 -26)" />
          </g>
        )}
        <path className="uni-azul" d={CUERPO} />
        <circle className="uni-punto" cx={272} cy={40} r={36} />
        <circle className="uni-cara" cx={157} cy={202} r={70} />
        <path className="uni-noche" d="M117 132 L197 132 L197 154 Q157 168 117 154 Z" />
        <path className="uni-noche" d="M157 94 L247 122 L157 150 L67 122 Z" />
        <path className="uni-borla" d="M157 122 L232 136 L232 172" />
        <circle className="uni-borla-punta" cx={232} cy={178} r={8} />
        <g transform="translate(157 208)">
          <Cara expresion={expresion} />
          <ellipse className="uni-cachete" cx={-46} cy={16} rx={11} ry={7} />
          <ellipse className="uni-cachete" cx={46} cy={16} rx={11} ry={7} />
        </g>
        {expresion === "preocupado" && <path className="uni-gota" transform="translate(228 168)" d="M0 -16 Q11 0 0 10 Q-11 0 0 -16 Z" />}
        {expresion === "sueno" && (
          <g className="uni-zetas">
            <path className="uni-zeta" d="M292 -8 L310 -8 L292 12 L310 12" />
            <path className="uni-zeta" d="M320 -44 L332 -44 L320 -30 L332 -30" />
          </g>
        )}
      </g>
    </svg>
  );
}
