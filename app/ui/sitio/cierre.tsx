import Link from "next/link";
import { PORCENTAJE_COMISION } from "@/app/lib/comision";
import { DOMINIO_INSTITUCIONAL } from "@/app/lib/validaciones-auth";
import { Foto } from "./foto";

// El final de la portada: la invitación a conducir (bloque azul), quiénes
// hacemos UniGo y la despedida con los botones para entrar.

export function Conducir() {
  return (
    // zona-azul: sobre el azul, el foco del teclado va en blanco (globals.css).
    <section className="tramo conducir zona-azul" id="conducir" aria-labelledby="titulo-conducir">
      <div className="marco">
        <div className="conducir-texto">
          <h2 id="titulo-conducir" className="cartel">
            ¿Ya vas para la U en carro o moto?
          </h2>
          <p className="entradilla">
            Lleva a un compañero y pon tu propio precio. Registras tu vehículo, subes tus documentos y, cuando el equipo los apruebe, te pones
            disponible o publicas tu hora de salida. De cada viaje recibes el {100 - PORCENTAJE_COMISION} %.
          </p>
          <Link href="/registro" className="boton boton-papel">
            Quiero conducir
          </Link>
        </div>
        <Foto alt="Motos y carros en una vía de Villavicencio" falta="motos y carros en una vía de Villavicencio" />
      </div>
    </section>
  );
}

const EQUIPO = [
  { nombre: "Dilan Santiago Chavarro Parra", rol: "Desarrollo, diseño de la experiencia y gestión del proyecto" },
  { nombre: "David Eduardo Durán Acevedo", rol: "Desarrollo, gestión del proyecto y pruebas" },
];

export function Equipo() {
  return (
    <section className="tramo" aria-labelledby="titulo-equipo">
      <div className="marco equipo">
        <Foto alt="La Universidad Santo Tomás en Villavicencio" falta="la Santo Tomás de Villavicencio o sus alrededores" />
        <div className="equipo-texto">
          <h2 id="titulo-equipo" className="cartel">
            De estudiantes para estudiantes.
          </h2>
          <p className="entradilla">
            UniGo es un proyecto académico de dos estudiantes de la Universidad Santo Tomás, seccional Villavicencio, que también necesitan llegar a
            clase.
          </p>
          <ul className="firmas">
            {EQUIPO.map((persona) => (
              <li key={persona.nombre}>
                <b>{persona.nombre}</b>
                <span>{persona.rol}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function Cierre() {
  return (
    <section className="tramo cierre" aria-labelledby="titulo-cierre">
      <div className="marco">
        <h2 id="titulo-cierre" className="cartel">
          Nos vemos en la U.
        </h2>
        <div className="acciones">
          <Link href="/registro" className="boton boton-lleno">
            Crear mi cuenta
          </Link>
          <Link href="/entrar" className="boton boton-borde">
            Ya tengo cuenta
          </Link>
        </div>
        <p className="correo">
          Solo con tu correo <strong>@{DOMINIO_INSTITUCIONAL}</strong>
        </p>
      </div>
    </section>
  );
}
