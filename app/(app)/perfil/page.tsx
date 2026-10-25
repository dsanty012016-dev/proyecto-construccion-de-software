import type { Metadata } from "next";
import Link from "next/link";
import { salir } from "@/app/lib/acciones-auth";
import { perfilActual } from "@/app/lib/sesion";
import { Avatar } from "@/app/ui/comun/avatar";
import { BotonCambiarModo } from "@/app/ui/comun/boton-cambiar-modo";
import { EstadoCuenta } from "@/app/ui/comun/estado-cuenta";

export const metadata: Metadata = { title: "Perfil" };

export default async function PaginaPerfil() {
  const { usuario, perfil } = await perfilActual();
  return (
    <main className="space-y-6 px-5 pt-6">
      <h1 className="text-3xl tracking-tight">Perfil</h1>
      <section aria-label="Tus datos" className="space-y-4 rounded-2xl bg-superficie p-5">
        <div className="flex items-center gap-3">
          <Avatar nombre={perfil?.nombre ?? "?"} grande sobreTarjeta />
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

      <EstadoCuenta personaId={usuario.id} siempre />

      {perfil?.rol && (
        <section aria-labelledby="titulo-modo" className="space-y-3 rounded-2xl bg-superficie p-5">
          <h2 id="titulo-modo" className="text-lg">
            Modo de uso
          </h2>
          <p className="text-sm text-texto-suave">
            {perfil.rol === "estudiante"
              ? "Hoy usas UniGo para pedir viajes. Si un día vas a llevar a alguien, cambia a conductor (para recibir solicitudes necesitas registrar tu vehículo)."
              : "Hoy usas UniGo para llevar estudiantes. Si un día necesitas que te lleven, cambia a estudiante."}
          </p>
          <BotonCambiarModo modoActual={perfil.rol} ancho />
        </section>
      )}

      {(perfil?.es_admin || perfil?.rol === "conductor") && (
        <nav aria-label="Más opciones" className="space-y-2">
          {perfil?.rol === "conductor" && (
            <Link
              href="/conductor/documentos"
              className="flex min-h-12 w-full items-center justify-center rounded-xl border border-texto-suave/30 font-semibold text-texto hover:bg-superficie"
            >
              Mis documentos
            </Link>
          )}
          {perfil?.es_admin && (
            <Link
              href="/admin"
              className="flex min-h-12 w-full items-center justify-center rounded-xl border border-secundario/50 font-semibold text-texto hover:bg-superficie"
            >
              Panel de administración
            </Link>
          )}
        </nav>
      )}

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
