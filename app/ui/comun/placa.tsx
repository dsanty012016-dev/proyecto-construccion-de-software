// La placa del vehículo, dibujada como una placa: es lo que el estudiante
// busca en la calle, así que va con la letra de las cifras y un borde firme.
// "grande" es para cuando el conductor ya va en camino.
export function Placa({ placa, grande }: { placa: string; grande?: boolean }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-md border-2 border-texto bg-fondo text-texto cifra tracking-[0.06em] ${
        grande ? "px-3 pt-1.5 pb-1 text-[2.25rem]" : "px-1.5 pt-0.5 text-[1.0625rem]"
      }`}
    >
      <span className="sr-only">Placa </span>
      {placa}
    </span>
  );
}
