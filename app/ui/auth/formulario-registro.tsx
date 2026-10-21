"use client";

import { useActionState, useId } from "react";
import { registrarse } from "@/app/lib/acciones-auth";
import { ESTADO_INICIAL } from "@/app/lib/estado-formulario";
import { LARGO_MINIMO_CLAVE } from "@/app/lib/validaciones-auth";
import { Aviso, BotonEnviar, Campo, CampoClave } from "./campos";

// Formulario de "Crear cuenta" (mockup Registro). Al terminar muestra que
// llegó un correo para activar la cuenta.
export function FormularioRegistro() {
  const [estado, accion] = useActionState(registrarse, ESTADO_INICIAL);
  const idRol = useId();
  const idTerminos = useId();
  const e = estado.errores ?? {};
  const v = estado.valores ?? {};

  if (estado.resultado === "listo") {
    return (
      <div className="space-y-4">
        <Aviso tipo="listo">{estado.mensaje}</Aviso>
        <p className="text-sm leading-relaxed text-texto-suave">
          Si no lo ves en unos minutos, revisa la carpeta de correo no deseado.
          El enlace solo sirve una vez.
        </p>
      </div>
    );
  }

  return (
    <form action={accion} noValidate className="space-y-4">
      {estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}

      <Campo
        etiqueta="Nombre completo"
        name="nombre"
        autoComplete="name"
        placeholder="Juan Pérez"
        defaultValue={v.nombre}
        error={e.nombre}
        required
      />
      <Campo
        etiqueta="Correo institucional"
        name="correo"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="juan.perez@ustavillavo.edu.co"
        defaultValue={v.correo}
        error={e.correo}
        required
      />
      <Campo
        etiqueta="Celular"
        name="telefono"
        type="tel"
        autoComplete="tel-national"
        inputMode="tel"
        placeholder="300 123 4567"
        prefijo="+57"
        defaultValue={v.telefono}
        error={e.telefono}
        required
      />

      <div>
        <label htmlFor={idRol} className="mb-1.5 block text-sm font-medium">
          Tipo de usuario
        </label>
        <select
          id={idRol}
          name="rol"
          defaultValue={v.rol ?? ""}
          aria-invalid={e.rol ? true : undefined}
          aria-describedby={e.rol ? `${idRol}-error` : undefined}
          className={`h-12 w-full rounded-xl border bg-superficie px-4 text-texto outline-none focus:border-secundario ${e.rol ? "border-error" : "border-superficie"}`}
          required
        >
          <option value="" disabled>
            Estudiante o conductor
          </option>
          <option value="estudiante">Estudiante: quiero pedir viajes</option>
          <option value="conductor">Conductor: quiero llevar compañeros</option>
        </select>
        {e.rol && (
          <p id={`${idRol}-error`} className="mt-1.5 text-sm text-error">
            {e.rol}
          </p>
        )}
      </div>

      <CampoClave
        etiqueta="Contraseña"
        name="clave"
        autoComplete="new-password"
        placeholder={`Mínimo ${LARGO_MINIMO_CLAVE} caracteres, con letras y números`}
        error={e.clave}
        required
      />
      <CampoClave
        etiqueta="Confirmar contraseña"
        name="confirmacion"
        autoComplete="new-password"
        error={e.confirmacion}
        required
      />

      <div>
        <div className="flex items-start gap-3">
          <input
            id={idTerminos}
            name="terminos"
            type="checkbox"
            defaultChecked={v.terminos === "on"}
            aria-invalid={e.terminos ? true : undefined}
            aria-describedby={e.terminos ? `${idTerminos}-error` : undefined}
            className="mt-0.5 size-5 shrink-0 accent-primario"
          />
          <label htmlFor={idTerminos} className="text-sm leading-relaxed text-texto-suave">
            Acepto los términos y condiciones y la política de tratamiento de
            datos de UniGo.
          </label>
        </div>
        {e.terminos && (
          <p id={`${idTerminos}-error`} className="mt-1.5 text-sm text-error">
            {e.terminos}
          </p>
        )}
      </div>

      <BotonEnviar enviando="Creando tu cuenta…">Registrarme</BotonEnviar>
    </form>
  );
}
