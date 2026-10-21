// Origen y destino de un viaje, uno sobre otro (en la fase 4 llevará el mapa).
export function RutaViaje({ origen, destino }: { origen: string; destino: string }) {
  return (
    <ol className="space-y-3" aria-label="Recorrido">
      <li className="flex items-start gap-3">
        <span aria-hidden="true" className="mt-1.5 size-2.5 shrink-0 rounded-full border-2 border-secundario" />
        <div className="min-w-0">
          <p className="text-xs text-texto-suave">Recogida</p>
          <p className="font-semibold break-words">{origen}</p>
        </div>
      </li>
      <li className="flex items-start gap-3">
        <span aria-hidden="true" className="mt-1.5 size-2.5 shrink-0 rounded-sm bg-secundario" />
        <div className="min-w-0">
          <p className="text-xs text-texto-suave">Destino</p>
          <p className="font-semibold break-words">{destino}</p>
        </div>
      </li>
    </ol>
  );
}
