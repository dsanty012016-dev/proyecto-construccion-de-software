import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cancelarViaje, iniciarViaje, terminarViaje } from "@/app/lib/acciones-viaje";
import { gananciaConductor } from "@/app/lib/comision";
import { viajeActivoDelConductor } from "@/app/lib/consultas-viaje";
import { nombreCorto, pesos } from "@/app/lib/formato";
import { exigirRol } from "@/app/lib/sesion";
import { ActualizarCada } from "@/app/ui/comun/actualizar-cada";
import { Avatar } from "@/app/ui/comun/avatar";
import { BotonAccion } from "@/app/ui/comun/boton-accion";
import { EncabezadoPantalla } from "@/app/ui/comun/encabezado-pantalla";
import { IconoTelefono } from "@/app/ui/comun/iconos-app";
import { PasosViaje } from "@/app/ui/comun/pasos-viaje";
import { RutaViaje } from "@/app/ui/comun/ruta-viaje";

export const metadata: Metadata = { title: "Tu viaje" };

// El viaje del conductor: ir a recoger al estudiante, iniciarlo y terminarlo.
export default async function PaginaViajeConductor() {
  const { usuario } = await exigirRol("conductor");
  const activo = await viajeActivoDelConductor(usuario.id);
  if (!activo) redirect("/conductor");
  const { viaje, estudiante } = activo;
  const enCurso = viaje.estado === "en_curso";
  const nombre = estudiante ? nombreCorto(estudiante.nombre) : "el estudiante";

  return (
    <main className="space-y-5 px-5 pt-6">
      <ActualizarCada segundos={6} />
      <EncabezadoPantalla titulo={enCurso ? `Llevando a ${nombre}` : `Ve a recoger a ${nombre}`} volverA="/conductor" />
      <PasosViaje estado={viaje.estado as "aceptado" | "en_curso"} />

      <section aria-label="Recorrido" className="space-y-4 rounded-2xl bg-superficie p-4">
        <RutaViaje origen={viaje.origen_texto} destino={viaje.destino_texto} />
        {estudiante && (
          <div className="flex items-center gap-3 border-t border-texto-suave/20 pt-4">
            <Avatar nombre={estudiante.nombre} />
            <p className="min-w-0 flex-1 truncate font-bold">{nombre}</p>
            {estudiante.telefono && (
              <a
                href={`tel:${estudiante.telefono}`}
                aria-label={`Llamar a ${nombre}`}
                className="flex size-12 items-center justify-center rounded-full border border-texto-suave/30 text-texto hover:bg-fondo"
              >
                <IconoTelefono className="size-5" />
              </a>
            )}
          </div>
        )}
      </section>

      {viaje.precio !== null && (
        <section aria-label="Pago" className="flex items-center justify-between gap-3 rounded-2xl bg-superficie p-4">
          <div>
            <p className="text-sm text-texto-suave">Recibes en tu billetera</p>
            <p className="text-xs text-texto-suave">Oferta {pesos(viaje.precio)} menos el 10 % de UniGo</p>
          </div>
          <p className="font-titulo text-xl font-bold">{pesos(gananciaConductor(viaje.precio))}</p>
        </section>
      )}

      {enCurso ? (
        <BotonAccion accion={terminarViaje} campos={{ viaje: viaje.id }} enviando="Terminando…" confirmar="¿Llegaron al destino? Se terminará el viaje.">
          Llegamos · Terminar viaje
        </BotonAccion>
      ) : (
        <>
          <BotonAccion accion={iniciarViaje} campos={{ viaje: viaje.id }} enviando="Iniciando…">
            {nombre === "el estudiante" ? "Ya se subió · Iniciar viaje" : `${nombre} se subió · Iniciar viaje`}
          </BotonAccion>
          <BotonAccion accion={cancelarViaje} campos={{ viaje: viaje.id }} estilo="peligro" confirmar="¿Cancelar el viaje?">
            Cancelar viaje
          </BotonAccion>
        </>
      )}
    </main>
  );
}
