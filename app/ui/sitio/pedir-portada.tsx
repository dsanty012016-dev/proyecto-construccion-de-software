"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { distanciaTexto } from "@/app/lib/mapa";
import { DOMINIO_INSTITUCIONAL } from "@/app/lib/validaciones-auth";
import { BARRIO_INICIAL, BARRIOS, barrioPorNombre, EVENTO_BARRIO } from "./plano-datos";

// La primera acción de la portada: eliges tu barrio, el plano de atrás dibuja
// la ruta real por las vías hasta la U y el botón te lleva a crear la cuenta
// para pedir el viaje. El barrio se le avisa al plano con un evento del navegador.
export function PedirPortada() {
  const [barrio, setBarrio] = useState(BARRIO_INICIAL);
  const datos = barrioPorNombre(barrio);

  function elegir(nombre: string) {
    setBarrio(nombre);
    window.dispatchEvent(new CustomEvent(EVENTO_BARRIO, { detail: nombre }));
  }

  return (
    <div className="pedir">
      <label htmlFor="barrio-portada">¿De dónde sales?</label>
      <div className="pedir-campo">
        <span className="punto" aria-hidden="true" />
        <select id="barrio-portada" value={barrio} onChange={(evento) => elegir(evento.target.value)}>
          {BARRIOS.map((b) => (
            <option key={b.nombre}>{b.nombre}</option>
          ))}
        </select>
      </div>
      <p className="pedir-destino">
        <Image className="solo-oscuro" src="/brand/icono-oscuro.png" alt="" width={18} height={24} />
        <Image className="solo-claro" src="/brand/icono-claro.png" alt="" width={18} height={24} />
        <span>
          Universidad Santo Tomás
          <small aria-live="polite">{distanciaTexto(datos.km)} por las vías</small>
        </span>
      </p>
      <Link href="/registro" className="boton boton-lleno">
        Pedir viaje
      </Link>
      <p className="correo">
        Solo con tu correo <strong>@{DOMINIO_INSTITUCIONAL}</strong>
      </p>
    </div>
  );
}
