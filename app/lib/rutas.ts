// Qué páginas necesitan sesión y a dónde se manda a cada quien. Lo usa el
// proxy (proxy.ts) en cada petición. Es una función pura para poder probarla.

/** Zona privada: sin sesión, se manda a /entrar. */
const PRIVADAS = ["/inicio", "/elegir-rol", "/nueva-clave", "/estudiante", "/conductor", "/viajes", "/perfil"];

/** Pantallas de acceso: con sesión ya no tienen sentido, se manda a /inicio. */
const SOLO_SIN_SESION = ["/entrar", "/registro", "/recuperar"];

function empiezaCon(ruta: string, base: string) {
  return ruta === base || ruta.startsWith(`${base}/`);
}

/** Devuelve la ruta a la que hay que redirigir, o null si puede seguir. */
export function redireccionPara(ruta: string, conSesion: boolean): string | null {
  if (!conSesion && PRIVADAS.some((base) => empiezaCon(ruta, base))) {
    return `/entrar?siguiente=${encodeURIComponent(ruta)}`;
  }
  if (conSesion && SOLO_SIN_SESION.some((base) => empiezaCon(ruta, base))) {
    return "/inicio";
  }
  return null;
}

/**
 * Valida el "siguiente" que llega en la URL para no redirigir a otro sitio
 * (por ejemplo, "//sitio-malo.com" o "https://..."). Solo rutas internas.
 */
export function destinoSeguro(siguiente: string | null | undefined, porDefecto = "/inicio") {
  if (!siguiente || !siguiente.startsWith("/") || siguiente.startsWith("//") || siguiente.includes("\\")) {
    return porDefecto;
  }
  return siguiente;
}
