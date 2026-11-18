"use client";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { reenviarConfirmacion } from "@/app/lib/acciones-auth";
import { segundosParaReenviar } from "@/app/lib/confirmacion-correo";
import { ESTADO_INICIAL } from "@/app/lib/estado-formulario";
import { Aviso, BotonEnviar, Campo, ResumenErrores } from "./campos";

export function FormularioConfirmacion({ correoInicial, esperaInicial }: { correoInicial?: string; esperaInicial?: number }) {
  const [estado, accion] = useActionState(reenviarConfirmacion, ESTADO_INICIAL);
  const [reloj, setReloj] = useState<{ solicitud: number; limite: number; ahora: number } | null>(null);
  const limiteEspera = estado.reintentarEn ?? esperaInicial;
  const espera = limiteEspera ? reloj?.solicitud === limiteEspera ? segundosParaReenviar(reloj.limite, reloj.ahora) : 60 : 0;
  useEffect(() => {
    if (!limiteEspera) return;
    // El reloj monotónico evita depender de la fecha del celular o del servidor.
    const limiteLocal = performance.now() + 60_000;
    const intervalo = setInterval(() => {
      const ahora = performance.now();
      setReloj({ solicitud: limiteEspera, limite: limiteLocal, ahora });
      if (ahora >= limiteLocal) clearInterval(intervalo);
    }, 1000);
    return () => clearInterval(intervalo);
  }, [limiteEspera]);
  return <div className="space-y-4">
    <form action={accion} noValidate className="space-y-4">
      <ResumenErrores estado={estado} />
      {estado.resultado === "listo" && <Aviso tipo="listo">{estado.mensaje}</Aviso>}
      <Campo etiqueta="Correo institucional para confirmar" name="correo" type="email" inputMode="email" autoComplete="email" maxLength={254} defaultValue={estado.valores?.correo ?? correoInicial ?? ""} error={estado.errores?.correo} required />
      <BotonEnviar enviando="Solicitando enlace…" deshabilitado={espera > 0}>{espera > 0 ? `Podrás reenviar en ${espera} s` : "Reenviar enlace de confirmación"}</BotonEnviar>
      <p className="text-sm text-texto-suave">Solicita el enlace para el correo con el que te registraste. Después de cada intento hay una espera de 60 segundos; el servicio también limita los envíos.</p>
    </form>
    <p className="text-sm text-texto-suave">¿Escribiste mal el correo al registrarte? Vuelve al registro y usa el correcto. Si ya registraste ese correo, solicita el enlace aquí; no necesitas crear otra cuenta.</p>
    <div className="flex flex-col gap-2">
      <Link href="/entrar" className="inline-flex min-h-11 items-center font-semibold text-secundario">Ya confirmé · iniciar sesión</Link>
      <a href="/registro" className="inline-flex min-h-11 items-center font-semibold text-secundario">Volver al registro y corregir el correo</a>
    </div>
  </div>;
}
