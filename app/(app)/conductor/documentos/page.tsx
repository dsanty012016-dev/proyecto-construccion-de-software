import type { Metadata } from "next";
import { misDocumentos } from "@/app/lib/consultas-verificacion";
import { TIPOS_DOCUMENTO } from "@/app/lib/documentos";
import { exigirRol } from "@/app/lib/sesion";
import { Aviso } from "@/app/ui/auth/campos";
import { EncabezadoPantalla } from "@/app/ui/comun/encabezado-pantalla";
import { SubirDocumento } from "@/app/ui/conductor/subir-documento";

export const metadata: Metadata = { title: "Mis documentos" };

// El conductor sube su cédula, licencia y tarjeta de propiedad. Hasta que
// los tres estén aprobados no puede ponerse disponible ni publicar cupos.
export default async function PaginaDocumentos() {
  const { usuario } = await exigirRol("conductor");
  const documentos = await misDocumentos(usuario.id);
  const aprobados = TIPOS_DOCUMENTO.filter((t) => documentos[t]?.estado === "aprobado").length;

  return (
    <main className="space-y-5 px-5 pt-6">
      <EncabezadoPantalla titulo="Mis documentos" texto={`${aprobados} de 3 aprobados`} volverA="/conductor" />
      {aprobados === 3 ? (
        <Aviso tipo="listo">Tu cuenta de conductor está verificada.</Aviso>
      ) : (
        <Aviso tipo="info">
          Para llevar estudiantes, un administrador de UniGo revisa tus documentos. Solo los ven tú y los administradores, y se
          guardan en un espacio privado.
        </Aviso>
      )}
      {TIPOS_DOCUMENTO.map((tipo) => (
        <SubirDocumento
          key={tipo}
          tipo={tipo}
          conductorId={usuario.id}
          estado={documentos[tipo]?.estado}
          motivo={documentos[tipo]?.motivo}
        />
      ))}
    </main>
  );
}
