import type { Metadata } from "next";
import Link from "next/link";
import { puestoActivoDelEstudiante } from "@/app/lib/consultas-cupo";
import { historialDeViajes, sedeDeUniversidad, viajeActivoDelEstudiante } from "@/app/lib/consultas-viaje";
import { etiquetaPuesto } from "@/app/lib/cupo";
import { etiquetaEstado, fechaCorta, nombreCorto, pesos } from "@/app/lib/formato";
import { exigirRol } from "@/app/lib/sesion";
import { Aviso } from "@/app/ui/auth/campos";
import { BotonCambiarModo } from "@/app/ui/comun/boton-cambiar-modo";
import { EstadoCuenta } from "@/app/ui/comun/estado-cuenta";
import { IconoSiguiente } from "@/app/ui/comun/iconos-app";
import { Mapa } from "@/app/ui/comun/mapa";
import { PastillaSaldo } from "@/app/ui/comun/pastilla-saldo";
import { RutaViaje } from "@/app/ui/comun/ruta-viaje";

export const metadata: Metadata = { title: "Inicio" };

const BOTON_PRINCIPAL =
  "flex h-14 w-full items-center justify-center rounded-2xl bg-primario font-titulo text-base font-semibold text-texto transition-colors hover:bg-primario/85";

// Inicio del estudiante (rediseño): el mapa arriba y, abajo, una sola cosa:
// pedir un viaje o volver al que ya tiene en marcha.
export default async function PaginaEstudiante({ searchParams }: { searchParams: Promise<{ clave?: string }> }) {
  const { usuario, perfil } = await exigirRol("estudiante");
  const { clave } = await searchParams;
  const [activo, historial, miPuesto, sede] = await Promise.all([
    viajeActivoDelEstudiante(usuario.id),
    historialDeViajes(usuario.id),
    puestoActivoDelEstudiante(usuario.id),
    sedeDeUniversidad(perfil.universidad_id),
  ]);
  const ultimo = historial.find((h) => h.viaje.estado === "terminado");
  const porCalificar = ultimo && !ultimo.calificado ? ultimo : null;
  const puntoSede = sede && sede.lat !== null && sede.lng !== null ? { lat: sede.lat, lng: sede.lng } : null;
  const nombreSede = sede?.nombre ?? "Tu universidad";

  return (
    <main>
      <div className="relative h-80">
        {puntoSede ? (
          <Mapa etiqueta="Mapa con tu universidad" centro={puntoSede} destino={puntoSede} aRas className="h-full" />
        ) : (
          <div className="h-full bg-superficie" />
        )}
        <div className="absolute inset-x-4 top-4 z-10 flex items-center justify-between gap-3">
          <BotonCambiarModo modoActual="estudiante" />
          <PastillaSaldo personaId={usuario.id} />
        </div>
      </div>

      <div className="relative -mt-5 space-y-5 rounded-t-3xl bg-fondo px-5 pt-5">
        <h1 className="text-2xl tracking-tight">Hola, {perfil.nombre.split(" ")[0]}. ¿Vamos a la U?</h1>

        {clave === "actualizada" && <Aviso tipo="listo">Tu contraseña quedó actualizada.</Aviso>}
        <EstadoCuenta personaId={usuario.id} />

        {activo ? (
          <section aria-labelledby="titulo-activo" className="space-y-4 rounded-2xl bg-superficie p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 id="titulo-activo" className="text-lg">
                {etiquetaEstado(activo.viaje.estado)}
              </h2>
              {activo.viaje.estado === "solicitado" && (
                <span className="text-sm font-semibold text-secundario">
                  {activo.ofertas.length === 0 ? "Sin ofertas aún" : `${activo.ofertas.length} ${activo.ofertas.length === 1 ? "oferta" : "ofertas"}`}
                </span>
              )}
            </div>
            <RutaViaje origen={activo.viaje.origen_texto} destino={activo.viaje.destino_texto} />
            <Link href="/estudiante/viaje" className={BOTON_PRINCIPAL}>
              {activo.viaje.estado === "solicitado" ? "Ver ofertas" : "Ver mi viaje"}
            </Link>
          </section>
        ) : miPuesto ? (
          <section aria-labelledby="titulo-mi-cupo" className="space-y-4 rounded-2xl bg-superficie p-4">
            <div>
              <h2 id="titulo-mi-cupo" className="text-lg">
                {miPuesto.cupo.estado === "en_curso" ? "Tu cupo ya salió" : etiquetaPuesto(miPuesto.puesto.estado)}
              </h2>
              <p className="text-sm text-texto-suave">Sale {fechaCorta(miPuesto.cupo.sale_en)}</p>
            </div>
            <RutaViaje origen={miPuesto.puesto.recogida_texto} destino={nombreSede} />
            <Link href={`/estudiante/cupos/${miPuesto.cupo.id}`} className={BOTON_PRINCIPAL}>
              Ver mi cupo
            </Link>
          </section>
        ) : (
          <section aria-labelledby="titulo-pedir" className="space-y-5">
            <h2 id="titulo-pedir" className="sr-only">
              Pedir un viaje
            </h2>
            <RutaViaje origen="El punto que elijas en el mapa" destino={nombreSede} />
            <nav aria-label="Cuándo sales" className="grid grid-cols-2 gap-1 rounded-2xl bg-superficie p-1">
              <span aria-current="page" className="flex min-h-11 items-center justify-center rounded-xl bg-fondo text-sm font-bold">
                Salir ahora
              </span>
              <Link href="/estudiante/cupos" className="flex min-h-11 items-center justify-center rounded-xl text-sm font-semibold text-texto-suave hover:text-texto">
                Con hora fija
              </Link>
            </nav>
            <div className="space-y-2">
              <Link href="/estudiante/pedir" className={BOTON_PRINCIPAL}>
                Pedir viaje
              </Link>
              <p className="text-center text-[13px] text-texto-suave">Los conductores te ofrecen precio y tú eliges.</p>
            </div>
          </section>
        )}

        {(porCalificar || ultimo) && (
          <ul className="divide-y divide-texto-suave/15 border-t border-texto-suave/15">
            {porCalificar && (
              <li>
                <Link href={`/viajes/${porCalificar.viaje.id}/calificar`} className="flex min-h-14 items-center gap-3 py-2 text-texto">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">
                      ¿Cómo te fue{porCalificar.otraPersona ? ` con ${nombreCorto(porCalificar.otraPersona)}` : ""}?
                    </span>
                    <span className="block text-[13px] text-secundario">Calificar el viaje</span>
                  </span>
                  <IconoSiguiente className="size-5 text-texto-suave" />
                </Link>
              </li>
            )}
            {ultimo && (
              <li>
                <Link href="/viajes" className="flex min-h-14 items-center gap-3 py-2 text-texto">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-texto-suave">Tu último viaje</span>
                    <span className="block truncate font-semibold">{ultimo.viaje.origen_texto}</span>
                  </span>
                  {ultimo.viaje.precio !== null && <span className="font-titulo font-semibold tabular-nums">{pesos(ultimo.viaje.precio)}</span>}
                  <IconoSiguiente className="size-5 text-texto-suave" />
                </Link>
              </li>
            )}
          </ul>
        )}
      </div>
    </main>
  );
}
