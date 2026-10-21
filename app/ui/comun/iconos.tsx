// Iconos en SVG, dibujados con trazo y del color del texto que los rodea
// (currentColor). Son decorativos: quien los usa pone el texto o el
// aria-label que explica qué significan.

interface PropsIcono {
  className?: string;
}

function Base({ className, children }: PropsIcono & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
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

export function IconoCheck(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M5 12.5l4.2 4.2L19 7" />
    </Base>
  );
}

export function IconoEquis(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Base>
  );
}

export function IconoEstrella({ className, llena = true }: PropsIcono & { llena?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={llena ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className ?? "size-5"}
    >
      <path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />
    </svg>
  );
}

export function IconoCarro(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M5 16V11l2-5h10l2 5v5" />
      <path d="M3 16h18v2.5H3z" />
      <circle cx="7.5" cy="13" r="0.6" />
      <circle cx="16.5" cy="13" r="0.6" />
      <path d="M6.5 18.5V20M17.5 18.5V20" />
    </Base>
  );
}

export function IconoEscudo(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6z" />
    </Base>
  );
}

export function IconoCorreo(props: PropsIcono) {
  return (
    <Base {...props}>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3.5 7l8.5 6 8.5-6" />
    </Base>
  );
}

export function IconoTelefono(props: PropsIcono) {
  return (
    <Base {...props}>
      <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
      <path d="M11 18.5h2" />
    </Base>
  );
}

export function IconoPin(props: PropsIcono) {
  return (
    <Base {...props}>
      <path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0113 0c0 4.8-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </Base>
  );
}

export function IconoReloj(props: PropsIcono) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Base>
  );
}

export function IconoTarjeta(props: PropsIcono) {
  return (
    <Base {...props}>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3 10h18M7 15h3" />
    </Base>
  );
}
