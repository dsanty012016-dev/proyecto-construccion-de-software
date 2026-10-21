"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconoInicio, IconoPerfil, IconoVehiculo, IconoViajes } from "./iconos-app";

// Barra de navegación inferior de la zona privada. Cambia según el rol y marca
// la pestaña actual. Es "use client" solo para saber en qué ruta está.

interface Pestana {
  href: string;
  texto: string;
  icono: React.ReactNode;
  /** Dice si la ruta actual pertenece a esta pestaña. */
  activa: (ruta: string) => boolean;
}

const dentroDe = (ruta: string, base: string) => ruta === base || ruta.startsWith(`${base}/`);

function pestanasDe(rol: "estudiante" | "conductor"): Pestana[] {
  const viajes: Pestana = { href: "/viajes", texto: "Viajes", icono: <IconoViajes />, activa: (r) => dentroDe(r, "/viajes") };
  const perfil: Pestana = { href: "/perfil", texto: "Perfil", icono: <IconoPerfil />, activa: (r) => dentroDe(r, "/perfil") };

  if (rol === "estudiante") {
    const inicio: Pestana = { href: "/estudiante", texto: "Inicio", icono: <IconoInicio />, activa: (r) => dentroDe(r, "/estudiante") };
    return [inicio, viajes, perfil];
  }
  // Para el conductor, ofertar y el viaje en curso cuentan como "Inicio";
  // el vehículo tiene su propia pestaña.
  const inicio: Pestana = {
    href: "/conductor",
    texto: "Inicio",
    icono: <IconoInicio />,
    activa: (r) => r === "/conductor" || dentroDe(r, "/conductor/ofertar") || dentroDe(r, "/conductor/viaje"),
  };
  const vehiculo: Pestana = { href: "/conductor/vehiculo", texto: "Vehículo", icono: <IconoVehiculo />, activa: (r) => dentroDe(r, "/conductor/vehiculo") };
  return [inicio, viajes, vehiculo, perfil];
}

export function BarraInferior({ rol }: { rol: "estudiante" | "conductor" }) {
  const ruta = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-texto-suave/20 bg-fondo pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-md justify-around px-2 py-1.5">
        {pestanasDe(rol).map((pestana) => {
          const activa = pestana.activa(ruta);
          return (
            <li key={pestana.href}>
              <Link
                href={pestana.href}
                aria-current={activa ? "page" : undefined}
                className={`flex min-h-12 min-w-16 flex-col items-center justify-center gap-0.5 rounded-lg px-3 text-xs font-semibold ${activa ? "text-secundario" : "text-texto-suave"}`}
              >
                {pestana.icono}
                {pestana.texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
