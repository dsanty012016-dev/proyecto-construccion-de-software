import { iniciales } from "@/app/lib/formato";

// Círculo con las iniciales de una persona (todavía no hay fotos de perfil).
export function Avatar({ nombre, grande }: { nombre: string; grande?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-fondo font-titulo font-bold text-texto ${grande ? "size-14 text-lg" : "size-12"}`}
    >
      {iniciales(nombre)}
    </span>
  );
}
