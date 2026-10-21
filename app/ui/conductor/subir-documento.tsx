"use client";

import { startTransition, useActionState, useId, useState } from "react";
import { enviarDocumento } from "@/app/lib/acciones-verificacion";
import { ayudaDocumento, nombreDocumento, problemaConArchivo, rutaDocumento, type TipoDocumento } from "@/app/lib/documentos";
import { ESTADO_INICIAL } from "@/app/lib/estado-formulario";
import { crearClienteNavegador } from "@/app/lib/supabase/client";
import { Aviso } from "@/app/ui/auth/campos";
import { IconoCheck } from "@/app/ui/comun/iconos-app";

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

  return (
    <section aria-labelledby={`${idArchivo}-titulo`} className="space-y-3 rounded-2xl bg-superficie p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id={`${idArchivo}-titulo`} className="text-base">
            {nombreDocumento(tipo)}
          </h2>
          <p className="text-sm text-texto-suave">{ayudaDocumento(tipo)}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            estado === "aprobado" ? "bg-primario text-texto" : estado === "rechazado" ? "bg-error/15 text-error" : "bg-fondo text-texto-suave"
          }`}
        >
          {estado ? ETIQUETAS[estado] : "Sin enviar"}
        </span>
      </div>

      {estado === "rechazado" && motivo && <Aviso tipo="error">Motivo: {motivo}</Aviso>}
      {resultado.resultado === "listo" && <Aviso tipo="listo">{resultado.mensaje}</Aviso>}
      {(problema || (resultado.resultado === "error" && resultado.mensaje)) && (
        <Aviso tipo="error">{problema ?? resultado.mensaje}</Aviso>
      )}

      {estado === "aprobado" ? (
        <p className="flex items-center gap-2 text-sm text-texto">
          <IconoCheck className="size-5 text-secundario" />
          Listo. Si necesitas cambiarlo, escríbenos.
        </p>
      ) : (
        <form onSubmit={alEnviar} className="space-y-3" noValidate>
          <div>
            <label htmlFor={idArchivo} className="mb-1.5 block text-sm font-medium">
              {estado ? "Subir de nuevo" : "Archivo"} (foto o PDF, hasta 5 MB)
            </label>
            <input
              id={idArchivo}
              name="archivo"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="block w-full text-sm text-texto-suave file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-fondo file:px-4 file:font-semibold file:text-texto"
            />
          </div>
          <label htmlFor={idAutorizo} className="flex items-start gap-3 text-sm text-texto-suave">
            <input id={idAutorizo} name="autorizo" value="si" type="checkbox" className="mt-0.5 size-5 shrink-0 accent-primario" />
            Autorizo a UniGo a guardar y revisar este documento solo para verificar que puedo conducir (Ley 1581 de 2012).
          </label>
          <button
            type="submit"
            disabled={ocupado}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-primario font-semibold text-texto transition-colors hover:bg-primario/85 disabled:opacity-70"
          >
            {subiendo ? "Subiendo…" : enviando ? "Enviando…" : "Enviar documento"}
          </button>
        </form>
      )}
    </section>
  );
}
