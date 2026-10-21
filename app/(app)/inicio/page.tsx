import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { salir } from "@/app/lib/acciones-auth";
import { perfilActual } from "@/app/lib/sesion";
import { Aviso } from "@/app/ui/auth/campos";

export const metadata: Metadata = { title: "Inicio" };

// Inicio provisional de la zona privada: confirma que el acceso funciona.
// Las pantallas reales de estudiante y conductor llegan en la fase 3.
export default async function PaginaInicio({
  searchParams,
}: {
  searchParams: Promise<{ clave?: string }>;
}) {
  const { perfil } = await perfilActual();
  if (!perfil?.rol) redirect("/elegir-rol");
  const { clave } = await searchParams;
  const primerNombre = perfil.nombre.split(" ")[0];

  return (
    <main className="space-y-8">
      <header>
        <h1 className="text-3xl tracking-tight">Hola, {primerNombre}</h1>
        <p className="mt-1 text-secundario">{perfil.rol === "conductor" ? "Conductor" : "Estudiante"}</p>
      </header>

      {clave === "actualizada" && <Aviso tipo="listo">Tu contraseña quedó actualizada.</Aviso>}

      <Aviso tipo="info">
        Tu cuenta está lista. Las pantallas para{" "}
        {perfil.rol === "conductor" ? "recibir solicitudes y ofertar" : "pedir viajes y ver ofertas"}{" "}
        llegan en la siguiente fase.
      </Aviso>

      <form action={salir}>
        <button
          type="submit"
          className="h-12 w-full rounded-xl border border-superficie font-semibold text-texto transition-colors hover:bg-superficie"
        >
          Cerrar sesión
        </button>
      </form>
    </main>
  );
}
