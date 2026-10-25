import {
  CALLES,
  EDIFICIOS,
  LARGO_CALLE,
  MEDIDA_MAPA,
  RUTA,
  UNIVERSIDAD,
} from "./mapa-ciudad";

// Mapa nocturno en SVG: es lo primero que se ve en la portada y el respaldo
// cuando el 3D no carga (sin WebGL, poco movimiento o conexión lenta).
// Se inclina con CSS para parecerse a la vista de la escena 3D.
export function MapaRespaldo() {
  const ruta = RUTA.map((p) => `${p.x},${p.z}`).join(" ");
  const inicio = RUTA[0];
  const fin = RUTA[RUTA.length - 1];
  const m = MEDIDA_MAPA;

  return (
    <div className="absolute inset-0 overflow-hidden [perspective:1200px]">
      <svg
        viewBox={`${-m} ${-m} ${m * 2} ${m * 2}`}
        className="absolute left-1/2 top-1/2 w-[175%] max-w-none -translate-x-1/2 -translate-y-[58%] [transform:rotateX(48deg)_rotateZ(-18deg)] sm:w-[96%] sm:-translate-y-[54%] sm:[transform:rotateX(52deg)_rotateZ(-18deg)]"
        aria-hidden="true"
        focusable="false"
      >
        {CALLES.map((c) => (
          <g key={c} className="stroke-linea" strokeWidth={0.06}>
            <line x1={c} y1={-LARGO_CALLE / 2} x2={c} y2={LARGO_CALLE / 2} />
            <line x1={-LARGO_CALLE / 2} y1={c} x2={LARGO_CALLE / 2} y2={c} />
          </g>
        ))}

        {EDIFICIOS.map((e, k) => (
          <rect
            key={k}
            x={e.x - e.ancho / 2}
            y={e.z - e.fondo / 2}
            width={e.ancho}
            height={e.fondo}
            rx={0.08}
            className="fill-superficie"
            opacity={Math.min(1, 0.45 + e.alto / 3)}
          />
        ))}

        {UNIVERSIDAD.edificios.map((e, k) => (
          <rect
            key={k}
            x={e.x - e.ancho / 2}
            y={e.z - e.fondo / 2}
            width={e.ancho}
            height={e.fondo}
            rx={0.1}
            className="fill-primario"
          />
        ))}

        {/* La ruta: un halo ancho y suave debajo, y la línea encima. */}
        <polyline
          points={ruta}
          fill="none"
          className="stroke-primario"
          strokeWidth={0.55}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.35}
        />
        <polyline
          points={ruta}
          fill="none"
          className="stroke-secundario animate-[trazar_2.4s_ease-out_both]"
          strokeWidth={0.18}
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
        />

        <circle cx={inicio.x} cy={inicio.z} r={0.7} className="fill-primario" opacity={0.25} />
        <circle cx={inicio.x} cy={inicio.z} r={0.32} className="fill-secundario stroke-texto" strokeWidth={0.1} />
        <circle cx={fin.x} cy={fin.z} r={0.3} className="fill-texto" />
      </svg>
    </div>
  );
}
