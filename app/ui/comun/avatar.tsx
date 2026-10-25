import { iniciales } from "@/app/lib/formato";

// Círculo con las iniciales de una persona (todavía no hay fotos de perfil).
// Como en los diseños, las iniciales van en azul; el círculo contrasta con lo
// que tiene debajo: sobre una tarjeta (superficie) es del color del fondo.
export function Avatar({ nombre, grande, sobreTarjeta }: { nombre: string; grande?: boolean; sobreTarjeta?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-titulo font-bold text-secundario ${sobreTarjeta ? "bg-fondo" : "bg-superficie"} ${grande ? "size-14 text-lg" : "size-12"}`}
    >
      {iniciales(nombre)}
    </span>
  );
}
