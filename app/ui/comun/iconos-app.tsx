// Iconos de la zona privada (barra inferior y pantallas de viaje). Son
// decorativos: el texto o el aria-label del control que los contiene dice qué
// hacen, por eso van con aria-hidden.
interface Props {
  className?: string;
}

function Base({ className, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className ?? "size-6"}
    >
      {children}
    </svg>
  );
}

export function IconoInicio(props: Props) {
  return (
    <Base {...props}>
      <path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" />
    </Base>
  );
}

export function IconoViajes(props: Props) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Base>
  );
}

export function IconoPerfil(props: Props) {
  return (
    <Base {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
    </Base>
  );
}

export function IconoVehiculo(props: Props) {
  return (
    <Base {...props}>
      <path d="M5 17h14M6 17l1.5-6h9L18 17M8 11l1-3h6l1 3" />
      <circle cx="8" cy="18" r="1.5" />
      <circle cx="16" cy="18" r="1.5" />
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

export function IconoTelefono(props: Props) {
  return (
    <Base {...props}>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2" />
    </Base>
  );
}

export function IconoEstrella({ llena, className }: Props & { llena?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={llena ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className ?? "size-6"}
    >
      <path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" />
    </svg>
  );
}

export function IconoCheck(props: Props) {
  return (
    <Base {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Base>
  );
}

export function IconoUbicacion(props: Props) {
  return (
    <Base {...props}>
      <path d="M12 21s7-5.6 7-11a7 7 0 10-14 0c0 5.4 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </Base>
  );
}
