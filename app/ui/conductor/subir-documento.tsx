"use client";

import { startTransition, useActionState, useId, useState } from "react";
import { enviarDocumento } from "@/app/lib/acciones-verificacion";
import { ayudaDocumento, nombreDocumento, problemaConArchivo, rutaDocumento, type TipoDocumento } from "@/app/lib/documentos";
import { ESTADO_INICIAL } from "@/app/lib/estado-formulario";
import { crearClienteNavegador } from "@/app/lib/supabase/client";
import { Aviso } from "@/app/ui/auth/campos";
import { IconoAlerta, IconoCheck, IconoSubir } from "@/app/ui/comun/iconos-app";

// Subir un documento del conductor. El archivo va directo del navegador al
// bucket privado "documentos" (en la carpeta del conductor, que es lo único
// que la política de Storage le deja escribir) y luego se registra en la base
// con la Server Action, que guarda también la autorización de datos.

interface Props {
  tipo: TipoDocumento;
  conductorId: string;
  estado?: "pendiente" | "aprobado" | "rechazado";
  motivo?: string | null;
}

const ETIQUETAS = { pendiente: "En revisión", aprobado: "Aprobado", rechazado: "Rechazado" } as const;

export function SubirDocumento({ tipo, conductorId, estado, motivo }: Props) {
  const [resultado, despachar, enviando] = useActionState(enviarDocumento, ESTADO_INICIAL);
  const [problema, setProblema] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const idArchivo = useId();
  const idAutorizo = useId();
  const ocupado = subiendo || enviando;

  async function alEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    const archivo = formulario.get("archivo");
    if (!(archivo instanceof File) || archivo.size === 0) {
      setProblema("Elige el archivo que vas a subir.");
      return;
    }
    if (formulario.get("autorizo") !== "si") {
      setProblema("Debes autorizar el tratamiento de tus datos para continuar.");
      return;
    }
    const error = problemaConArchivo(archivo);
    if (error) {
      setProblema(error);
      return;
    }
    setProblema(null);
    setSubiendo(true);
    const ruta = rutaDocumento(conductorId, tipo, archivo.type, Date.now());
    const { error: errorSubida } = await crearClienteNavegador()
      .storage.from("documentos")
      .upload(ruta, archivo, { contentType: archivo.type, upsert: false });
    setSubiendo(false);
    if (errorSubida) {
      setProblema("No pudimos subir el archivo. Revisa tu conexión e inténtalo de nuevo.");
      return;
    }
    const datos = new FormData();
    datos.set("tipo", tipo);
    datos.set("ruta", ruta);
    datos.set("autorizo", "si");
    startTransition(() => despachar(datos));
  }

  const textoEstado = estado ? ETIQUETAS[estado] : "Sin enviar";
  return (
    <section aria-labelledby={`${idArchivo}-titulo`} className="space-y-3 border-b border-texto-suave/15 py-4 last:border-b-0">
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden="true"
          className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
            estado === "aprobado"
              ? "bg-secundario/15 text-secundario"
              : estado === "rechazado"
                ? "bg-error/15 text-error"
                : "border-2 border-dashed border-texto-suave/50"
          }`}
        >
          {estado === "aprobado" && <IconoCheck className="size-5" />}
          {estado === "rechazado" && <IconoAlerta className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`${idArchivo}-titulo`} className="font-texto text-base font-bold">
            {nombreDocumento(tipo)}
          </h2>
          <p className={`text-[13px] ${estado === "aprobado" ? "text-secundario" : estado === "rechazado" ? "text-error" : "text-texto-suave"}`}>
            {estado === "rechazado" ? `${textoEstado} · súbelo de nuevo` : estado === "pendiente" ? `${textoEstado} · te avisamos aquí` : textoEstado}
          </p>
        </div>
      </div>

      {estado === "rechazado" && motivo && <Aviso tipo="error">Motivo: {motivo}</Aviso>}
      {resultado.resultado === "listo" && <Aviso tipo="listo">{resultado.mensaje}</Aviso>}
      {(problema || (resultado.resultado === "error" && resultado.mensaje)) && (
        <Aviso tipo="error">{problema ?? resultado.mensaje}</Aviso>
      )}

      {estado !== "aprobado" && (
        <form onSubmit={alEnviar} className="space-y-3" noValidate>
          <div>
            <label htmlFor={idArchivo} className="mb-1.5 block text-sm font-medium">
              {estado ? "Subir otro archivo" : "Archivo"} <span className="text-texto-suave">(foto o PDF, hasta 5 MB)</span>
            </label>
            <p className="mb-2 text-[13px] text-texto-suave">{ayudaDocumento(tipo)}</p>
            <input
              id={idArchivo}
              name="archivo"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="block w-full text-sm text-texto-suave file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-superficie file:px-4 file:font-semibold file:text-texto"
            />
          </div>
          <label htmlFor={idAutorizo} className="flex items-start gap-3 text-[13px] text-texto-suave">
            <input id={idAutorizo} name="autorizo" value="si" type="checkbox" className="mt-0.5 size-5 shrink-0 accent-primario" />
            Autorizo a UniGo a guardar y revisar este documento solo para verificar que puedo conducir (Ley 1581 de 2012).
          </label>
          <button
            type="submit"
            disabled={ocupado}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primario font-titulo font-semibold text-texto transition-colors hover:bg-primario/85 disabled:opacity-70"
          >
            <IconoSubir className="size-[18px]" />
            {subiendo ? "Subiendo…" : enviando ? "Enviando…" : "Enviar documento"}
          </button>
        </form>
      )}
    </section>
  );
}
