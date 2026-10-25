// Iconos de las pantallas de acceso (correo, candado, ojo). Decorativos: el
// texto o el aria-label del control que los contiene dice qué hacen.
interface Props {
  className?: string;
}

function Base({ className, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className ?? "size-5"}
    >
      {children}
    </svg>
  );
}

export function IconoCorreo(props: Props) {
  return (
    <Base {...props}>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3.5 7l8.5 6 8.5-6" />
    </Base>
  );
}

export function IconoCandado(props: Props) {
  return (
    <Base {...props}>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 018 0v3" />
    </Base>
  );
}

export function IconoOjo(props: Props) {
  return (
    <Base {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </Base>
  );
}

export function IconoOjoTachado(props: Props) {
  return (
    <Base {...props}>
      <path d="M4 4l16 16" />
      <path d="M9.9 5.8A9.6 9.6 0 0112 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 01-3 3.7M6.3 7.3C3.9 9 2.5 12 2.5 12S6 18.5 12 18.5a9 9 0 004.2-1" />
      <path d="M9.9 9.9a3 3 0 004.2 4.2" />
    </Base>
  );
}

export function IconoAtras(props: Props) {
  return (
    <Base {...props}>
      <path d="M15 5l-7 7 7 7" />
    </Base>
  );
}

export function IconoPersona(props: Props) {
  return (
    <Base {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
    </Base>
  );
}
