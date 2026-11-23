// Reglas puras del asistente de UniGo ("Uni"): a qué pantallas puede llevar,
// cómo entiende una hora escrita a mano, cuándo conviene pedir ya o buscar un
// cupo, el guion de respaldo (cuando la IA no responde) y cómo se valida lo
// que devuelve la IA. Sin React, sin reloj ni azar: la hora y el azar entran
// por parámetro, como el resto de reglas de app/lib.

export type RolAsistente = "estudiante" | "conductor";

export interface MensajeAsistente {
  de: "persona" | "asistente";
  texto: string;
}

export interface AccionAsistente {
  etiqueta: string;
  ruta: string;
}

export interface RespuestaAsistente {
  texto: string;
  acciones: AccionAsistente[];
}

export const NOMBRE_ASISTENTE = "Uni";
export const MAX_MENSAJES_HISTORIAL = 12;
export const MAX_LARGO_MENSAJE = 500;
export const MAX_LARGO_RESPUESTA = 900;
/** Minutos de anticipación desde los que conviene un cupo con hora fija en vez de pedir ya. */
export const MINUTOS_PARA_CUPO = 45;

interface Destino {
  ruta: string;
  etiqueta: string;
  roles: RolAsistente[];
  /** Qué es, para que la IA sepa cuándo ofrecerlo. */
  para: string;
}

/**
 * Las únicas pantallas a las que el asistente puede llevar. La IA solo
 * devuelve estos identificadores; nunca una ruta escrita por ella.
 */
export const DESTINOS = {
  pedir_ida: { ruta: "/estudiante/pedir?sentido=ida", etiqueta: "Pedir viaje a la U", roles: ["estudiante"], para: "pedir un viaje ya, de su casa a la universidad; los conductores ofertan precio" },
  pedir_regreso: { ruta: "/estudiante/pedir?sentido=regreso", etiqueta: "Pedir viaje a casa", roles: ["estudiante"], para: "pedir un viaje ya, de la universidad a su casa" },
  cupos_ida: { ruta: "/estudiante/cupos?sentido=ida", etiqueta: "Ver cupos hacia la U", roles: ["estudiante"], para: "buscar un cupo con hora fija que publicó un conductor hacia la universidad; se paga hasta 10 minutos antes de salir" },
  cupos_regreso: { ruta: "/estudiante/cupos?sentido=regreso", etiqueta: "Ver cupos de regreso", roles: ["estudiante"], para: "buscar un cupo con hora fija de la universidad a casa" },
  mi_viaje_estudiante: { ruta: "/estudiante/viaje", etiqueta: "Ver mi viaje", roles: ["estudiante"], para: "ver el viaje en curso, las ofertas, compartirlo o cancelarlo" },
  inicio_conductor: { ruta: "/conductor", etiqueta: "Ir a mi inicio", roles: ["conductor"], para: "ponerse disponible y ver solicitudes cercanas para ofertar" },
  publicar_cupo: { ruta: "/conductor/cupo/nuevo", etiqueta: "Publicar un cupo", roles: ["conductor"], para: "publicar a qué hora sale, cuántos puestos tiene y el precio por puesto" },
  mis_cupos: { ruta: "/conductor/cupo", etiqueta: "Ver mis cupos", roles: ["conductor"], para: "ver y aprobar las solicitudes de sus cupos publicados" },
  mi_viaje_conductor: { ruta: "/conductor/viaje", etiqueta: "Ver mi viaje", roles: ["conductor"], para: "ver el viaje en curso como conductor" },
  documentos: { ruta: "/conductor/documentos", etiqueta: "Mis documentos", roles: ["conductor"], para: "subir cédula, licencia y tarjeta de propiedad para que el equipo los apruebe" },
  vehiculo: { ruta: "/conductor/vehiculo", etiqueta: "Mi vehículo", roles: ["conductor"], para: "registrar o cambiar el carro o la moto" },
  retiros: { ruta: "/billetera/retiros", etiqueta: "Retirar mi plata", roles: ["conductor"], para: "pedir el retiro de sus ganancias por Nequi, desde $20.000, en máximo 7 días" },
  billetera: { ruta: "/billetera", etiqueta: "Ir a la billetera", roles: ["estudiante", "conductor"], para: "ver el saldo y recargar con Wompi (Nequi, PSE, Bancolombia o tarjeta) desde $20.000" },
  viajes: { ruta: "/viajes", etiqueta: "Mis viajes", roles: ["estudiante", "conductor"], para: "ver el historial de viajes y cupos, recibos y calificar" },
  perfil: { ruta: "/perfil", etiqueta: "Mi perfil", roles: ["estudiante", "conductor"], para: "cambiar sus datos, teléfono y avisos" },
  faltas: { ruta: "/perfil/faltas", etiqueta: "Mis faltas", roles: ["estudiante", "conductor"], para: "ver sus strikes y suspensiones" },
} satisfies Record<string, Destino>;

export type IdDestino = keyof typeof DESTINOS;

export function destinosPara(rol: RolAsistente): IdDestino[] {
  return (Object.keys(DESTINOS) as IdDestino[]).filter((id) => (DESTINOS[id].roles as RolAsistente[]).includes(rol));
}

function accion(id: IdDestino): AccionAsistente {
  return { etiqueta: DESTINOS[id].etiqueta, ruta: DESTINOS[id].ruta };
}

// ---------- La hora ----------

export interface Hora {
  h: number;
  m: number;
}

const NUMEROS: Record<string, number> = {
  una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
};

function sinTildes(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * La hora que la persona escribió ("a las 6", "6:30", "las seis y media",
 * "7 pm", "18:00"). Sin am/pm, de 5 a 11 se entiende de mañana y de 1 a 4 de
 * tarde, que es como hablan los estudiantes. Null si no hay hora.
 */
export function extraerHora(texto: string): Hora | null {
  const t = sinTildes(texto).replace(/(\d)\s*([ap])\.?\s*m\.?/g, "$1 $2m");
  const patron =
    /(?:a las|las|a la|tipo|como a las|sobre las|salgo a las|entro a las)?\s*\b(\d{1,2}|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)(?:\s*[:h.]\s*(\d{2})|\s+y\s+(media|cuarto|\d{1,2}))?\s*(am|pm|de la manana|de la tarde|de la noche|de la madrugada)?/;
  const candidatos = [...t.matchAll(new RegExp(patron, "g"))].filter((r) => {
    // Solo cuenta si parece hora: lleva "las", minutos o am/pm.
    return /las|la\b|tipo|sobre/.test(r[0]) || r[2] || r[3] || r[4];
  });
  const r = candidatos[0];
  if (!r) return null;

  let h = /^\d+$/.test(r[1]) ? Number(r[1]) : NUMEROS[r[1]];
  let m = 0;
  if (r[2]) m = Number(r[2]);
  else if (r[3] === "media") m = 30;
  else if (r[3] === "cuarto") m = 15;
  else if (r[3]) m = Number(r[3]);
  if (h > 23 || m > 59) return null;

  const marca = r[4] ?? "";
  if (h <= 12) {
    if (marca === "pm" || marca === "de la tarde" || marca === "de la noche") {
      if (h < 12) h += 12;
    } else if (marca === "am" || marca === "de la manana" || marca === "de la madrugada") {
      if (h === 12) h = 0;
    } else if (h >= 1 && h <= 4) {
      h += 12;
    }
  }
  return { h, m };
}

/** Hora y minutos en Colombia (UTC-5, sin horario de verano). */
export function horaEnColombia(ahora: Date): Hora {
  const minutos = (ahora.getUTCHours() * 60 + ahora.getUTCMinutes() - 5 * 60 + 24 * 60) % (24 * 60);
  return { h: Math.floor(minutos / 60), m: minutos % 60 };
}

/** Minutos desde ahora hasta la próxima vez que sea esa hora (mañana si ya pasó). */
export function minutosHasta(hora: Hora, ahora: Date): number {
  const actual = horaEnColombia(ahora);
  const diferencia = hora.h * 60 + hora.m - (actual.h * 60 + actual.m);
  return diferencia >= 0 ? diferencia : diferencia + 24 * 60;
}

export function textoHora({ h, m }: Hora): string {
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h < 12 ? "a. m." : "p. m."}`;
}

/** Pedir ya (los conductores ofertan en minutos) o buscar un cupo con hora fija. */
export function sugerirModo(minutos: number): "pedir_ya" | "cupo" {
  return minutos <= MINUTOS_PARA_CUPO ? "pedir_ya" : "cupo";
}

// ---------- Personalidad ----------

function elegir<T>(opciones: readonly T[], azar: number): T {
  const i = Math.min(opciones.length - 1, Math.max(0, Math.floor(azar * opciones.length)));
  return opciones[i];
}

const MADRUGADA = [
  "¿A las {hora}? ¿Tú duermes o solo parpadeas fuerte?",
  "¿{hora}? Respeto. Los gallos te tienen como referente.",
  "¿Clase a las {hora}? Quien armó ese horario no te quiere, pero yo sí.",
  "¿A las {hora}? Hasta el café sigue dormido a esa hora.",
] as const;

const NOCHE = [
  "¿A las {hora}? Trasnochador profesional, veo.",
  "¿{hora}? Esa hora es para dormir o para arrepentirse de no haber dormido.",
] as const;

const NORMAL = [
  "{hora}, hora decente. Me caes bien.",
  "¿{hora}? Perfecto, hasta te da tiempo de desayunar.",
] as const;

/** Un comentario pícaro según la hora, nunca sobre la persona en sí. */
export function comentarioDeHora(hora: Hora, azar: number): string {
  const lista = hora.h >= 3 && hora.h < 7 ? MADRUGADA : hora.h >= 22 || hora.h < 3 ? NOCHE : NORMAL;
  return elegir(lista, azar).replace("{hora}", textoHora(hora));
}

export function saludo(rol: RolAsistente, ahora: Date, azar: number, nombre = ""): string {
  const { h } = horaEnColombia(ahora);
  // El nombre lo pone la app en el saludo; nunca llega a la IA (historialParaIA
  // descarta lo que Uni dice antes del primer mensaje de la persona).
  const n = nombre ? `, ${nombre}` : "";
  const momento =
    h < 5
      ? `¿Despierto a esta hora${n}? Yo porque no duermo, ¿y tú?`
      : h < 6
        ? `¡Buenos días${n}! ¿A esta hora? Hasta yo sigo en pijama.`
        : h < 12
          ? `Buenos días${n}.`
          : h < 19
            ? `Buenas tardes${n}.`
            : `Buenas noches${n}.`;
  const oferta =
    rol === "estudiante"
      ? "Dime a qué hora tienes que llegar a la U y te digo si pides ya o buscas un cupo."
      : "Dime a qué hora sales para la U y te ayudo a publicar tu cupo o a conseguir pasajeros.";
  const extra = elegir(["Soy Uni, tu copiloto (no manejo, pero opino).", "Soy Uni. Sé de rutas, de plata y de madrugar."], azar);
  return `${momento} ${extra} ${oferta}`;
}

// ---------- Guion de respaldo ----------

interface Contexto {
  rol: RolAsistente;
  ahora: Date;
  azar: number;
}

const tiene = (t: string, ...palabras: string[]) => palabras.some((p) => t.includes(p));

/**
 * Respuesta sin IA: entiende lo más común por palabras clave. Se usa cuando
 * no hay clave de Gemini, se acabó el cupo del día o la IA no respondió.
 */
export function respuestaDeGuion(mensaje: string, { rol, ahora, azar }: Contexto): RespuestaAsistente {
  const t = sinTildes(mensaje);
  const hora = extraerHora(mensaje);
  const regreso = tiene(t, "casa", "regreso", "volver", "devuelta", "de vuelta", "salir de la u", "salgo de la u");

  if (rol === "conductor" && hora) {
    const minutos = minutosHasta(hora, ahora);
    return {
      texto: `${comentarioDeHora(hora, azar)} Publica tu cupo para las ${textoHora(hora)} con los puestos libres y el precio por puesto; los estudiantes de tu ruta te piden puesto y tú apruebas.${minutos <= MINUTOS_PARA_CUPO ? " Como es pronto, también puedes ponerte disponible y ofertar a solicitudes cercanas." : ""}`,
      acciones: minutos <= MINUTOS_PARA_CUPO ? [accion("publicar_cupo"), accion("inicio_conductor")] : [accion("publicar_cupo")],
    };
  }

  if (rol === "estudiante" && hora) {
    const minutos = minutosHasta(hora, ahora);
    const modo = sugerirModo(minutos);
    if (modo === "pedir_ya") {
      return {
        texto: `${comentarioDeHora(hora, azar)} Para las ${textoHora(hora)} te conviene pedir el viaje ya: los conductores te ofertan en minutos y eliges el que te guste.`,
        acciones: [accion(regreso ? "pedir_regreso" : "pedir_ida")],
      };
    }
    return {
      texto: `${comentarioDeHora(hora, azar)} Faltan más de ${MINUTOS_PARA_CUPO} minutos, así que busca un cupo con hora fija: pides puesto, el conductor aprueba y pagas hasta 10 minutos antes de salir. Si no hay cupos, pide el viaje unos 30 minutos antes.`,
      acciones: [accion(regreso ? "cupos_regreso" : "cupos_ida"), accion(regreso ? "pedir_regreso" : "pedir_ida")],
    };
  }

  if (tiene(t, "recarg", "saldo", "plata", "pagar", "nequi", "pse", "tarjeta") && !tiene(t, "retir")) {
    return {
      texto: "En la billetera recargas desde $20.000 con Nequi, PSE, Bancolombia o tarjeta. El viaje se paga con ese saldo al aceptar la oferta, nada de efectivo ni de \"te debo el pasaje\".",
      acciones: [accion("billetera")],
    };
  }
  if (tiene(t, "retir", "ganancia", "cobrar") && rol === "conductor") {
    return { texto: "Retiras tus ganancias por Nequi desde $20.000 y el equipo te las envía en máximo 7 días. Te quedas con el 90 % de cada viaje.", acciones: [accion("retiros")] };
  }
  if (tiene(t, "documento", "licencia", "cedula", "tarjeta de propiedad", "verific", "aprob")) {
    return rol === "conductor"
      ? { texto: "Sube cédula, licencia y tarjeta de propiedad. El equipo los revisa (en máximo 7 días desde cada envío) y cuando estén aprobados ya puedes conducir.", acciones: [accion("documentos"), accion("vehiculo")] }
      : { texto: "Los conductores pasan por revisión de cédula, licencia y tarjeta de propiedad antes de su primer viaje. Si quieres conducir, cambia a modo conductor en tu inicio.", acciones: [] };
  }
  if (tiene(t, "cancel")) {
    return {
      texto: "Puedes cancelar desde la pantalla del viaje. Ojo: si el conductor ya va en camino, se cobra el 20 % y sumas un strike. Si algo raro pasa, cancela reportando y te devolvemos todo.",
      acciones: [accion(rol === "estudiante" ? "mi_viaje_estudiante" : "mi_viaje_conductor")],
    };
  }
  if (tiene(t, "strike", "falta", "suspend", "sancion")) {
    return { texto: "A los 3 strikes hay suspensión: 3 días la primera vez, luego 7, 15 y 30. Aquí ves los tuyos (ojalá esté vacío).", acciones: [accion("faltas")] };
  }
  if (tiene(t, "cupo", "hora fija", "programad", "puesto")) {
    return rol === "conductor"
      ? { texto: "Un cupo es tu salida con hora fija: publicas la hora, los puestos y el precio por puesto, y los estudiantes de tu ruta piden puesto.", acciones: [accion("publicar_cupo"), accion("mis_cupos")] }
      : { texto: "Un cupo es una salida con hora fija que publica un conductor. Pides tu puesto desde un punto de su recorrido, él aprueba y pagas hasta 10 minutos antes de salir.", acciones: [accion("cupos_ida")] };
  }
  if (tiene(t, "pedir", "viaje", "llevar", "ir a la u", "voy a la u", "llegar")) {
    return rol === "estudiante"
      ? { texto: "Marca en el mapa dónde te recogen y toca \"Guardar esta ubicación\". Los conductores te mandan su precio y tú eliges. ¿A qué hora tienes que llegar? Así te digo si pides ya o buscas cupo.", acciones: [accion(regreso ? "pedir_regreso" : "pedir_ida")] }
      : { texto: "Como conductor, ponte disponible en tu inicio para ver solicitudes cercanas y ofertar tu precio, o publica un cupo con hora fija.", acciones: [accion("inicio_conductor"), accion("publicar_cupo")] };
  }
  if (tiene(t, "segur", "miedo", "confi")) {
    return { texto: "Solo entran correos de la U, los conductores pasan revisión de documentos, el teléfono del otro solo se ve durante el viaje y puedes compartir tu viaje en vivo con alguien de confianza.", acciones: [] };
  }
  if (tiene(t, "hola", "buenas", "hey", "que tal", "quien eres")) {
    return { texto: saludo(rol, ahora, azar), acciones: [] };
  }
  return {
    texto: elegir(
      [
        "Eso se me escapó. Pregúntame cómo pedir un viaje, qué es un cupo, cómo recargar o dime a qué hora vas a la U.",
        "No te entendí, y eso que leo rápido. Prueba con algo como \"voy a la U a las 7\" o \"¿cómo recargo?\".",
      ],
      azar,
    ),
    acciones: [],
  };
}

// ---------- IA ----------

/** Lo que se le explica a Gemini en cada conversación. No lleva datos personales. */
export function instruccionesDelSistema(rol: RolAsistente, ahora: Date): string {
  const destinos = destinosPara(rol)
    .map((id) => `- ${id}: ${DESTINOS[id].para}`)
    .join("\n");
  return `Eres ${NOMBRE_ASISTENTE}, el asistente de UniGo, una app de viajes entre estudiantes de la Universidad Santo Tomás en Villavicencio (Colombia), estilo InDrive: el estudiante pide, los conductores (también estudiantes) le ofertan precio y él elige. También hay cupos: salidas con hora fija que publica un conductor.

La persona está en modo ${rol}. Hora actual en Colombia: ${textoHora(horaEnColombia(ahora))}.

Tu trabajo: ayudarle a moverse por la app y a decidir. Si dice a qué hora tiene que llegar o salir, calcula cuánto falta: con ${MINUTOS_PARA_CUPO} minutos o menos conviene pedir el viaje ya; con más, buscar un cupo con hora fija (y si no hay, pedir unos 30 minutos antes).

Reglas de UniGo que puedes contar (no inventes otras):
- Solo entran correos @ustavillavo.edu.co. Los conductores suben cédula, licencia y tarjeta de propiedad y el equipo los aprueba.
- Se paga con el saldo de la billetera al aceptar la oferta. Recargas desde $20.000 con Wompi (Nequi, PSE, Bancolombia o tarjeta).
- El conductor recibe el 90 % y UniGo el 10 %. Retiros por Nequi desde $20.000 en máximo 7 días.
- Si el estudiante cancela con el conductor en camino, se cobra el 20 % y suma un strike. Si el conductor cancela, se devuelve todo y él suma un strike. A los 3 strikes: suspensión de 3, 7, 15 y 30 días.
- El teléfono del otro solo se ve durante el viaje. El viaje se puede compartir en vivo.
- Cupos: se paga hasta 10 minutos antes de la salida.
Si no sabes algo, dilo y sugiere escribir al equipo desde el perfil. Nunca prometas precios, horarios de conductores ni disponibilidad.

Personalidad: pícaro pero amable, en español de Colombia, tuteando. Un chiste corto cuando venga al caso (por ejemplo, si va a la U a las 6: "¿A las 6? ¿Tú duermes o solo parpadeas fuerte?"). Nunca te burles de la persona, ni bromees con seguridad, plata, accidentes, reportes o problemas personales: ahí eres claro y serio. Máximo 3 frases cortas. Sin emojis en exceso (uno como mucho).

Pantallas a las que puedes llevar (usa solo estos identificadores en "destinos", máximo 2, y solo si sirven para lo que pidió):
${destinos}

Responde SOLO con JSON: {"texto": "...", "destinos": ["id", ...]}.`;
}

/** Valida lo que devolvió la IA: texto razonable y solo destinos permitidos para el rol. */
export function interpretarRespuestaIA(crudo: unknown, rol: RolAsistente): RespuestaAsistente | null {
  if (!crudo || typeof crudo !== "object") return null;
  const { texto, destinos } = crudo as { texto?: unknown; destinos?: unknown };
  if (typeof texto !== "string") return null;
  const limpio = texto.trim();
  if (!limpio) return null;
  const permitidos = new Set<string>(destinosPara(rol));
  const ids = Array.isArray(destinos) ? destinos.filter((d): d is IdDestino => typeof d === "string" && permitidos.has(d)) : [];
  return {
    texto: limpio.length > MAX_LARGO_RESPUESTA ? `${limpio.slice(0, MAX_LARGO_RESPUESTA - 1)}…` : limpio,
    acciones: [...new Set(ids)].slice(0, 2).map(accion),
  };
}

/** Recorta el historial que se manda a la IA: los últimos mensajes, empezando por la persona. */
export function historialParaIA(historial: readonly MensajeAsistente[]): MensajeAsistente[] {
  const ultimos = historial.slice(-MAX_MENSAJES_HISTORIAL).map((m) => ({ de: m.de, texto: m.texto.slice(0, MAX_LARGO_MENSAJE) }));
  const inicio = ultimos.findIndex((m) => m.de === "persona");
  return inicio === -1 ? [] : ultimos.slice(inicio);
}
