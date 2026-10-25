import type { Metadata } from "next";
import { misDocumentos } from "@/app/lib/consultas-verificacion";
import { TIPOS_DOCUMENTO } from "@/app/lib/documentos";
import { exigirRol } from "@/app/lib/sesion";
import { Aviso } from "@/app/ui/auth/campos";
import { EncabezadoPantalla } from "@/app/ui/comun/encabezado-pantalla";
import { SubirDocumento } from "@/app/ui/conductor/subir-documento";

export const metadata: Metadata = { title: "Mis documentos" };

// Verificación (rediseño): el avance grande arriba y cada documento como fila.
// El conductor sube su cédula, licencia y tarjeta de propiedad. Hasta que
// los tres estén aprobados no puede ponerse disponible ni publicar cupos.
export default async function PaginaDocumentos() {
  const { usuario } = await exigirRol("conductor");
  const documentos = await misDocumentos(usuario.id);
  const aprobados = TIPOS_DOCUMENTO.filter((t) => documentos[t]?.estado === "aprobado").length;

  return (
    <main className="space-y-6 px-5 pt-4">
      <EncabezadoPantalla titulo={aprobados === 3 ? "Cuenta verificada" : "Antes de tu primer viaje"} volverA="/conductor" />
      <div className="space-y-2.5">
        <p className="font-titulo text-[32px] font-bold tracking-tight tabular-nums">
          {aprobados} de 3 <span className="text-lg font-semibold tracking-normal text-texto-suave">aprobados</span>
        </p>
        <div aria-hidden="true" className="grid grid-cols-3 gap-1.5">
          {TIPOS_DOCUMENTO.map((t, i) => (
            <span key={t} className={`h-1.5 rounded-full ${i < aprobados ? "bg-secundario" : "bg-texto-suave/25"}`} />
          ))}
        </div>
        {aprobados === 3 ? (
          <Aviso tipo="listo">Ya puedes ponerte disponible y publicar cupos.</Aviso>
        ) : (
          <p className="text-sm leading-relaxed text-texto-suave">Hasta tener los tres aprobados no puedes ponerte disponible ni publicar cupos.</p>
        )}
      </div>
      <div>
        {TIPOS_DOCUMENTO.map((tipo) => (
          <SubirDocumento
            key={tipo}
            tipo={tipo}
            conductorId={usuario.id}
            estado={documentos[tipo]?.estado}
            motivo={documentos[tipo]?.motivo}
          />
        ))}
      </div>
      <p className="pb-4 text-[13px] leading-relaxed text-texto-suave">
        Las fotos solo las ven tú y los administradores de UniGo que revisan tu cuenta. Se guardan en un espacio privado.
      </p>
    </main>
  );
}
