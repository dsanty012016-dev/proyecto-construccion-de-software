"use client";

import { useActionState, useId, useState } from "react";
import { registrarse } from "@/app/lib/acciones-auth";
import { ESTADO_INICIAL } from "@/app/lib/estado-formulario";
import { LARGO_MINIMO_CLAVE } from "@/app/lib/validaciones-auth";
import { Aviso, BotonEnviar, Campo, CampoClave, ResumenErrores } from "./campos";
import { FormularioConfirmacion } from "./formulario-confirmacion";

// Formulario de "Crear cuenta" (mockup Registro). Al terminar muestra que
// llegó un correo para activar la cuenta.
export function FormularioRegistro() {
  const [estado, accion] = useActionState(registrarse, ESTADO_INICIAL);
  const idRol = useId();
  const idTerminos = useId();
  const e = estado.errores ?? {};
  const v = estado.valores ?? {};
  const [rolElegido, setRolElegido] = useState("");

  if (estado.resultado === "listo") {
    return (
      <div className="space-y-4">
        <Aviso tipo="listo">{estado.mensaje}</Aviso>
        <p className="text-sm leading-relaxed text-texto-suave">
          Si no lo ves en unos minutos, revisa la carpeta de correo no deseado.
          El enlace solo sirve una vez.
        </p>
        <FormularioConfirmacion correoInicial={v.correo} esperaInicial={estado.reintentarEn} />
      </div>
    );
  }

  return (
    <form action={accion} noValidate className="space-y-4">
      <ResumenErrores estado={estado} />

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
        <label htmlFor={idRol} className="mb-1.5 block text-[15px] font-semibold">
          ¿Cómo quieres empezar?
        </label>
        <select
          id={idRol}
          name="rol"
          defaultValue={v.rol ?? ""}
          onChange={(e) => setRolElegido(e.target.value)}
          aria-invalid={e.rol ? true : undefined}
          aria-describedby={`${idRol}-ayuda${e.rol ? ` ${idRol}-error` : ""}`}
          className={`h-13 w-full rounded-xl border-2 bg-superficie px-4 text-texto focus:border-secundario ${e.rol ? "border-error" : "border-texto-suave/60"}`}
          required
        >
          <option value="" disabled>
            Estudiante o conductor
          </option>
          <option value="estudiante">Estudiante: quiero pedir viajes</option>
          <option value="conductor">Conductor: quiero llevar compañeros</option>
        </select>
        <p id={`${idRol}-ayuda`} className="mt-2 text-sm text-texto-suave">Puedes cambiar de modo desde Perfil con la misma cuenta. {rolElegido === "conductor" ? "Para conducir registrarás tu vehículo y enviarás cédula, licencia y tarjeta de propiedad; la revisión tarda máximo 7 días desde cada envío." : "Si después quieres conducir, registrarás tu vehículo y tus documentos."}</p>
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
        placeholder={`Letras y números, mínimo ${LARGO_MINIMO_CLAVE}`}
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
            Leí y acepto la{" "}
            <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="font-semibold">
              política de privacidad
              <span className="sr-only"> (se abre en otra pestaña)</span>
            </a>{" "}
            de UniGo y autorizo el tratamiento de mis datos.
          </label>
        </div>
        {e.terminos && (
          <p id={`${idTerminos}-error`} className="mt-1.5 text-sm text-error">
            {e.terminos}
          </p>
        )}
      </div>

      <BotonEnviar enviando="Creando tu cuenta…">Crear mi cuenta</BotonEnviar>
    </form>
  );
}
