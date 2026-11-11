import Link from "next/link";
import { enlaceDeFiltro, ESTADOS, TIPOS, type Filtro } from "@/app/lib/historial";

// Filtros de "Mis viajes". Son enlaces que cambian la URL, no estado de React:
// funcionan sin JavaScript, el botón "atrás" los deshace y se pueden compartir.
// Por eso este componente es de servidor (sin "use client").

const NOMBRE_TIPO: Record<Filtro["tipo"], string> = { todos: "Todos", pedido: "Por pedido", cupo: "Cupos" };
const NOMBRE_ESTADO: Record<Filtro["estado"], string> = { todos: "Todos", terminado: "Terminados", cancelado: "Cancelados" };

// Mismo aspecto que el selector de ida y regreso: el activo en azul lleno.
const OPCION =
  "flex min-h-11 items-center justify-center rounded-xl px-2 text-center text-sm font-semibold transition-colors motion-reduce:transition-none";
const ACTIVA = "bg-primario text-sobre-primario";
const INACTIVA = "text-texto-suave hover:text-texto";

export function FiltrosHistorial({ filtro }: { filtro: Filtro }) {
  return (
    <nav aria-label="Filtrar mis viajes" className="space-y-3">
      <Grupo
        titulo="Tipo"
        opciones={TIPOS.map((tipo) => ({
          clave: tipo,
          texto: NOMBRE_TIPO[tipo],
          activa: filtro.tipo === tipo,
          href: enlaceDeFiltro({ ...filtro, tipo }),
        }))}
      />
      <Grupo
        titulo="Estado"
        opciones={ESTADOS.map((estado) => ({
          clave: estado,
          texto: NOMBRE_ESTADO[estado],
          activa: filtro.estado === estado,
          href: enlaceDeFiltro({ ...filtro, estado }),
        }))}
      />
      {/* Se prende y se apaga: el enlace lleva al filtro contrario. */}
      <Link
        href={enlaceDeFiltro({ ...filtro, pendientes: !filtro.pendientes })}
        aria-current={filtro.pendientes ? "page" : undefined}
        className={`${OPCION} w-full gap-2 border ${filtro.pendientes ? `${ACTIVA} border-primario` : `${INACTIVA} border-texto-suave/30`}`}
      >
        {/* La marca dice "prendido" sin depender solo del color. */}
        {filtro.pendientes && <span aria-hidden="true">✓</span>}
        Solo por calificar
      </Link>
    </nav>
  );
}

interface Opcion {
  clave: string;
  texto: string;
  activa: boolean;
  href: string;
}

function Grupo({ titulo, opciones }: { titulo: string; opciones: Opcion[] }) {
  const id = `filtro-${titulo.toLowerCase()}`;
  return (
    <div>
      <p id={id} className="mb-1.5 text-[13px] font-semibold text-texto-suave">
        {titulo}
      </p>
      <ul aria-labelledby={id} className="grid grid-cols-3 gap-1 rounded-2xl bg-superficie p-1">
        {opciones.map((opcion) => (
          <li key={opcion.clave}>
            <Link
              href={opcion.href}
              aria-current={opcion.activa ? "page" : undefined}
              className={`${OPCION} ${opcion.activa ? ACTIVA : INACTIVA}`}
            >
              {opcion.texto}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
