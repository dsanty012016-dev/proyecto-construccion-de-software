"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconoBilletera, IconoInicio, IconoPerfil, IconoVehiculo, IconoViajes } from "./iconos-app";

// Barra de navegación inferior de la zona privada. Cambia según el rol y marca
// la pestaña actual: la línea de arriba es una ruta y la pestaña en la que
// estás es su parada (el mismo dibujo de las paradas de la portada).
// Es "use client" solo para saber en qué ruta está.

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
  const billetera: Pestana = { href: "/billetera", texto: "Billetera", icono: <IconoBilletera />, activa: (r) => dentroDe(r, "/billetera") };

  if (rol === "estudiante") {
    const inicio: Pestana = { href: "/estudiante", texto: "Inicio", icono: <IconoInicio />, activa: (r) => dentroDe(r, "/estudiante") };
    return [inicio, viajes, billetera, perfil];
  }
  // Para el conductor, ofertar, el viaje en curso y el cupo cuentan como "Inicio";
  // el vehículo tiene su propia pestaña.
  const inicio: Pestana = {
    href: "/conductor",
    texto: "Inicio",
    icono: <IconoInicio />,
    activa: (r) => r === "/conductor" || dentroDe(r, "/conductor/ofertar") || dentroDe(r, "/conductor/viaje") || dentroDe(r, "/conductor/cupo"),
  };
  const vehiculo: Pestana = { href: "/conductor/vehiculo", texto: "Vehículo", icono: <IconoVehiculo />, activa: (r) => dentroDe(r, "/conductor/vehiculo") || dentroDe(r, "/conductor/documentos") };
  return [inicio, viajes, vehiculo, billetera, perfil];
}

export function BarraInferior({ rol }: { rol: "estudiante" | "conductor" }) {
  const ruta = usePathname();
  return (
    <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-linea bg-fondo pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md justify-around px-2 pb-2">
        {pestanasDe(rol).map((pestana) => {
          const activa = pestana.activa(ruta);
          return (
            <li key={pestana.href}>
              <Link
                href={pestana.href}
                aria-current={activa ? "page" : undefined}
                className={`relative flex min-h-14 min-w-14 flex-col items-center justify-center gap-1 px-1 pt-2.5 text-xs ${
                  activa
                    ? "font-bold text-texto before:absolute before:-top-px before:left-1/2 before:size-3.5 before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:border-[3px] before:border-primario before:bg-fondo"
                    : "font-semibold text-texto-suave hover:text-texto"
                }`}
              >
                <span className={activa ? "text-secundario" : undefined}>{pestana.icono}</span>
                {pestana.texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
