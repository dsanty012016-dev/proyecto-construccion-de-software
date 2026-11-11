import { BotonTema } from "@/app/ui/comun/boton-tema";

// Marco de las pantallas de acceso: una columna angosta, como en los mockups
// de celular, centrada también en pantallas grandes.
export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-sm flex-col px-6 py-10">
      {/* Modo claro u oscuro, arriba a la derecha (no estorba al botón de volver). */}
      <BotonTema className="absolute top-3 right-3" />
      {children}
    </main>
  );
}
