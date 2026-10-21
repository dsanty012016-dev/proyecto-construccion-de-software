import type { Metadata } from "next";
import { salir } from "@/app/lib/acciones-auth";
import { perfilActual } from "@/app/lib/sesion";
import { Avatar } from "@/app/ui/comun/avatar";

export const metadata: Metadata = { title: "Perfil" };

export default async function PaginaPerfil() {
  const { usuario, perfil } = await perfilActual();
  return (
    <main className="space-y-6 px-5 pt-6">
      <h1 className="text-3xl tracking-tight">Perfil</h1>
      <section aria-label="Tus datos" className="space-y-4 rounded-2xl bg-superficie p-5">
        <div className="flex items-center gap-3">
          <Avatar nombre={perfil?.nombre ?? "?"} grande />
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">{perfil?.nombre}</p>
            <p className="text-sm text-secundario">{perfil?.rol === "conductor" ? "Conductor" : "Estudiante"}</p>
          </div>
        </div>
        <dl className="space-y-3 border-t border-texto-suave/20 pt-4 text-sm">
          <div>
            <dt className="text-texto-suave">Correo</dt>
            <dd className="break-all font-semibold">{usuario.email}</dd>
          </div>
          {perfil?.telefono && (
            <div>
              <dt className="text-texto-suave">Celular</dt>
              <dd className="font-semibold">{perfil.telefono}</dd>
            </div>
          )}
        </dl>
      </section>

      <form action={salir}>
        <button
          type="submit"
          className="h-12 w-full rounded-xl border border-texto-suave/30 font-semibold text-texto transition-colors hover:bg-superficie"
        >
          Cerrar sesión
        </button>
      </form>
    </main>
  );
}
