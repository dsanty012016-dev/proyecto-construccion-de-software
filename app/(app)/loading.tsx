// Mientras llega una pantalla de la app: bloques con la forma de lo que viene
// (no una rueda girando en la mitad). Respeta "menos movimiento".
export default function Cargando() {
  return (
    <main aria-busy="true" className="space-y-5 px-5 pt-6">
      <p className="sr-only" role="status">
        Cargando…
      </p>
      <div aria-hidden="true" className="space-y-5 motion-safe:animate-pulse">
        <div className="h-8 w-2/3 rounded-lg bg-superficie" />
        <div className="h-44 rounded-2xl bg-superficie" />
        <div className="space-y-3">
          <div className="h-5 w-1/2 rounded bg-superficie" />
          <div className="h-14 rounded-xl bg-superficie" />
          <div className="h-14 rounded-xl bg-superficie" />
        </div>
      </div>
    </main>
  );
}
