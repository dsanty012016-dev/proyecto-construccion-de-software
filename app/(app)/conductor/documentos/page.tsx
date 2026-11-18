import type { Metadata } from "next";
import { horaDeRevisionDocumentos, misDocumentos } from "@/app/lib/consultas-verificacion";
import { TIPOS_DOCUMENTO } from "@/app/lib/documentos";
import { exigirRol } from "@/app/lib/sesion";
import { Aviso } from "@/app/ui/auth/campos";
import { EncabezadoPantalla } from "@/app/ui/comun/encabezado-pantalla";
import { SubirDocumento } from "@/app/ui/conductor/subir-documento";
import Link from "next/link";
import { vehiculoDe } from "@/app/lib/consultas-viaje";
import { preparacionConductor, revisionDocumento } from "@/app/lib/preparacion-conductor";
import { ActualizarEstado } from "@/app/ui/comun/actualizar-estado";

export const metadata: Metadata = { title: "Mis documentos" };

// Verificación (rediseño): el avance grande arriba y cada documento como fila.
// El conductor sube su cédula, licencia y tarjeta de propiedad. Hasta que
// los tres estén aprobados no puede ponerse disponible ni publicar cupos.
export default async function PaginaDocumentos() {
  const { usuario } = await exigirRol("conductor");
  const [documentos, vehiculo] = await Promise.all([misDocumentos(usuario.id), vehiculoDe(usuario.id)]);
  const ahora = horaDeRevisionDocumentos();
  const { enviados } = preparacionConductor(!!vehiculo, documentos, false);
  const aprobados = TIPOS_DOCUMENTO.filter((t) => documentos[t]?.estado === "aprobado").length;

  return (
    <main className="space-y-6 px-5 pt-4">
      <EncabezadoPantalla titulo={aprobados === 3 ? "Cuenta verificada" : "Antes de tu primer viaje"} volverA="/conductor" />
      <div className="space-y-2.5">
        <p className="cifra text-[2.5rem]">
          {enviados} de 3 <span className="text-lg font-semibold [font-stretch:100%] text-texto-suave">enviados</span>
        </p>
        <p className="text-sm text-texto-suave">{aprobados} de 3 aprobados. Cada documento se revisa en un máximo de 7 días desde su envío.</p>
        <div aria-hidden="true" className="grid grid-cols-3 gap-1.5">
          {TIPOS_DOCUMENTO.map((t, i) => (
            <span key={t} className={`h-1.5 rounded-full ${i < aprobados ? "bg-secundario" : "bg-texto-suave/25"}`} />
          ))}
        </div>
        {aprobados === 3 && vehiculo ? (
          <Aviso tipo="listo">Ya puedes ponerte disponible y publicar cupos.</Aviso>
        ) : aprobados === 3 ? (
          <Aviso tipo="info">Tus documentos están aprobados. <Link href="/conductor/vehiculo" className="inline-flex min-h-11 items-center font-semibold text-secundario">Registra tu vehículo para continuar.</Link></Aviso>
        ) : (
          <p className="text-sm leading-relaxed text-texto-suave">Hasta tener los tres aprobados no puedes ponerte disponible ni publicar cupos.</p>
        )}
        <ActualizarEstado />
      </div>
      <div>
        {TIPOS_DOCUMENTO.map((tipo) => (
          <SubirDocumento
            key={tipo}
            tipo={tipo}
            conductorId={usuario.id}
            estado={documentos[tipo]?.estado}
            motivo={documentos[tipo]?.motivo}
            enviadoEn={documentos[tipo]?.enviado_en}
            revision={documentos[tipo] ? revisionDocumento(documentos[tipo]!, ahora) : undefined}
          />
        ))}
      </div>
      <p className="pb-4 text-[13px] leading-relaxed text-texto-suave">
        Las fotos solo las ven tú y los administradores de UniGo que revisan tu cuenta. Se guardan en un espacio privado.
      </p>
    </main>
  );
}
