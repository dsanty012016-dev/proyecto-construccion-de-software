import type { Metadata } from "next";
import Link from "next/link";
import { salir } from "@/app/lib/acciones-auth";
import { perfilActual } from "@/app/lib/sesion";
import { Avatar } from "@/app/ui/comun/avatar";
import { BotonCambiarModo } from "@/app/ui/comun/boton-cambiar-modo";
import { EstadoCuenta } from "@/app/ui/comun/estado-cuenta";
import { ActivarNotificaciones } from "@/app/ui/comun/activar-notificaciones";
import { InstalarApp } from "@/app/ui/comun/instalar-app";
import { IconoSiguiente } from "@/app/ui/comun/iconos-app";

export const metadata: Metadata = { title: "Perfil" };

const FILA = "flex min-h-14 items-center gap-3 py-2 text-texto hover:text-secundario";

// Perfil (fase 6): tus datos, el modo de uso y los accesos, en filas como el
// resto de la app rediseñada en vez de tarjetas apiladas.
export default async function PaginaPerfil() {
  const { usuario, perfil } = await perfilActual();
  const conductor = perfil?.rol === "conductor";

  return (
    <main className="space-y-7 px-5 pt-6 pb-4">
      <header className="flex items-center gap-4">
        <Avatar nombre={perfil?.nombre ?? "?"} grande />
        <div className="min-w-0">
          <h1 className="truncate text-2xl tracking-tight">{perfil?.nombre}</h1>
          <p className="text-sm font-semibold text-secundario">{conductor ? "Conductor" : "Estudiante"}</p>
        </div>
      </header>

      <dl className="divide-y divide-texto-suave/15 border-y border-texto-suave/15 text-sm">
        <div className="flex items-baseline justify-between gap-4 py-3">
          <dt className="text-texto-suave">Correo</dt>
          <dd className="min-w-0 text-right font-semibold break-all">{usuario.email}</dd>
        </div>
        {perfil?.telefono && (
          <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-texto-suave">Celular</dt>
            <dd className="font-semibold tabular-nums">{perfil.telefono}</dd>
          </div>
        )}
      </dl>

      <EstadoCuenta personaId={usuario.id} siempre />
      <InstalarApp />
      <ActivarNotificaciones enPerfil />

      {perfil?.rol && (
        <section aria-labelledby="titulo-modo" className="space-y-3">
          <h2 id="titulo-modo" className="text-lg">
            Modo de uso
          </h2>
          <p className="text-sm leading-relaxed text-texto-suave">
            {conductor
              ? "Hoy usas UniGo para llevar estudiantes. Si un día necesitas que te lleven, cambia a estudiante."
              : "Hoy usas UniGo para pedir viajes. Si un día vas a llevar a alguien, cambia a conductor (necesitas registrar tu vehículo y tus documentos)."}
          </p>
          <BotonCambiarModo modoActual={perfil.rol} ancho />
        </section>
      )}

      {(conductor || perfil?.es_admin) && (
        <nav aria-label="Más opciones">
          <ul className="divide-y divide-texto-suave/15 border-y border-texto-suave/15">
            {conductor && (
              <li>
                <Link href="/conductor/vehiculo" className={FILA}>
                  <span className="flex-1 font-semibold">Mi vehículo</span>
                  <IconoSiguiente className="size-5 text-texto-suave" />
                </Link>
              </li>
            )}
            {conductor && (
              <li>
                <Link href="/conductor/documentos" className={FILA}>
                  <span className="flex-1 font-semibold">Mis documentos</span>
                  <IconoSiguiente className="size-5 text-texto-suave" />
                </Link>
              </li>
            )}
            {perfil?.es_admin && (
              <li>
                <Link href="/admin" className={FILA}>
                  <span className="flex-1 font-semibold">Panel de administración</span>
                  <IconoSiguiente className="size-5 text-texto-suave" />
                </Link>
              </li>
            )}
          </ul>
        </nav>
      )}

      <form action={salir}>
        <button type="submit" className="min-h-12 w-full rounded-xl text-sm font-semibold text-texto-suave hover:text-texto">
          Cerrar sesión
        </button>
      </form>
    </main>
  );
}
