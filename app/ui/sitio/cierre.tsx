import Link from "next/link";
import { PORCENTAJE_COMISION } from "@/app/lib/comision";
import { DIAS_REVISION_DOCUMENTOS } from "@/app/lib/preparacion-conductor";
import { DOMINIO_INSTITUCIONAL } from "@/app/lib/validaciones-auth";

// El final de la portada: la invitación a conducir y el cajetín del plano
// (el recuadro de datos de un plano técnico), con quiénes hacemos UniGo y los
// botones para entrar.

export function Conducir() {
  return (
    <section className="tramo-plano a-la-derecha" id="conducir" data-foco="cupos" data-lado="derecha" data-capa="cupos" aria-labelledby="titulo-conducir">
      <div className="rotulo">
        <h2 id="titulo-conducir" className="cartel">
          ¿Ya vas para la U en carro o moto?
        </h2>
        <p className="entradilla">Lleva a un compañero de la U y pon tu propio precio. Recibes el {100 - PORCENTAJE_COMISION} % del valor del viaje.</p>
        <ol className="pasos-conductor" aria-label="Cómo empezar a conducir">
          <li>
            <b>Registra tu vehículo</b>
            <span>Agrega los datos de tu carro o moto.</span>
          </li>
          <li>
            <b>Envía tus documentos</b>
            <span>El equipo revisa tu cédula, licencia y tarjeta de propiedad en un plazo de {DIAS_REVISION_DOCUMENTOS} días desde cada envío.</span>
          </li>
          <li>
            <b>Empieza a conducir</b>
            <span>Cuando aprueben tus documentos, ponte disponible o publica tu hora de salida.</span>
          </li>
        </ol>
        <Link href="/registro" className="boton boton-borde">
          Quiero conducir
        </Link>
      </div>
    </section>
  );
}

const EQUIPO = [
  { nombre: "Dilan Santiago Chavarro Parra", rol: "Desarrollo, diseño de la experiencia y gestión del proyecto" },
  { nombre: "David Eduardo Durán Acevedo", rol: "Desarrollo, gestión del proyecto y pruebas" },
  { nombre: "Andrés Santiago Perdomo Suárez", rol: "Desarrollo" },
];

export function Cierre() {
  return (
    <section className="tramo-plano abajo" data-foco="todo" data-lado="abajo" aria-labelledby="titulo-cierre">
      <div className="cajetin">
        <dl className="cajetin-datos">
          <div>
            <dt>Proyecto</dt>
            <dd>UniGo · Tu viaje, tu universidad</dd>
          </div>
          <div>
            <dt>Lugar</dt>
            <dd>Universidad Santo Tomás, seccional Villavicencio</dd>
          </div>
        </dl>
        <dl className="cajetin-datos">
          <div>
            <dt>Hecho por estudiantes de la U</dt>
            {EQUIPO.map((persona) => (
              <dd key={persona.nombre}>
                {persona.nombre}
                <small>{persona.rol}</small>
              </dd>
            ))}
          </div>
        </dl>
        <div className="cajetin-cierre">
          <div>
            <h2 id="titulo-cierre" className="cartel">
              Nos vemos en la U.
            </h2>
            <p>
              Solo con tu correo <strong>@{DOMINIO_INSTITUCIONAL}</strong>
            </p>
          </div>
          <div className="acciones">
            <Link href="/registro" className="boton boton-lleno">
              Crear mi cuenta
            </Link>
            <Link href="/entrar" className="boton boton-borde">
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
