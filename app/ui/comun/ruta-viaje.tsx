// La "línea del viaje": el punto de recogida, la ruta punteada y la U de la
// sede. Se repite en todas las pantallas para que el recorrido se lea igual.

interface Props {
  origen: string;
  destino: string;
  etiquetaOrigen?: string;
  etiquetaDestino?: string;
}

/** Versión vertical, con etiquetas arriba de cada lugar. */
export function RutaViaje({ origen, destino, etiquetaOrigen = "Te recogen en", etiquetaDestino = "Vas a" }: Props) {
  return (
    <div className="grid grid-cols-[20px_minmax(0,1fr)] gap-x-3.5">
      <span aria-hidden="true" className="flex flex-col items-center pt-1.5">
        <PuntoOrigen />
        <span className="my-1 w-0.5 flex-1 bg-[repeating-linear-gradient(var(--color-secundario)_0_4px,transparent_4px_9px)]" />
        <PuntoDestino />
      </span>
      <ol aria-label="Recorrido" className="space-y-3.5">
        <li className="flex min-h-11 flex-col justify-center">
          <span className="text-[13px] text-texto-suave">{etiquetaOrigen}</span>
          <span className="font-bold break-words">{origen}</span>
        </li>
        <li className="flex min-h-11 flex-col justify-center">
          <span className="text-[13px] text-texto-suave">{etiquetaDestino}</span>
          <span className="font-bold break-words">{destino}</span>
        </li>
      </ol>
    </div>
  );
}

/** Versión en una línea, para encabezar una pantalla sin ocupar espacio. */
export function RutaCorta({ origen, destino }: { origen: string; destino: string }) {
  return (
    <p className="flex items-center gap-2.5 rounded-2xl bg-superficie px-3.5 py-3 text-sm font-semibold">
      <span className="sr-only">De</span>
      <PuntoOrigen pequeno />
      <span className="min-w-0 truncate">{origen}</span>
      <span aria-hidden="true" className="h-0.5 min-w-6 flex-1 bg-[repeating-linear-gradient(90deg,var(--color-secundario)_0_4px,transparent_4px_9px)]" />
      <span className="sr-only">a</span>
      <span className="max-w-[45%] shrink-0 truncate">{destino}</span>
      <PuntoDestino pequeno />
    </p>
  );
}

function PuntoOrigen({ pequeno }: { pequeno?: boolean }) {
  return <span aria-hidden="true" className={`shrink-0 rounded-full border-2 border-texto bg-primario ${pequeno ? "size-2.5" : "size-3"}`} />;
}

function PuntoDestino({ pequeno }: { pequeno?: boolean }) {
  return <span aria-hidden="true" className={`shrink-0 rounded-[3px] bg-texto ${pequeno ? "size-2.5" : "size-3"}`} />;
}
