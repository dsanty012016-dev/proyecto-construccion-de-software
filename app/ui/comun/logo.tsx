import Image from "next/image";

// Logo de UniGo según el modo: el de letras blancas sobre el fondo oscuro y
// el de letras azul noche sobre el claro (docs/identidad.md). Van los dos y
// globals.css esconde el que no toca (.solo-oscuro / .solo-claro).
export function Logo({
  ancho,
  alto,
  className,
  alt = "UniGo",
  prioridad,
  sinOptimizar,
}: {
  ancho: number;
  alto: number;
  className?: string;
  alt?: string;
  prioridad?: boolean;
  /** Para la página sin conexión: la imagen se pide tal cual, sin pasar por el servidor. */
  sinOptimizar?: boolean;
}) {
  return (
    <>
      <Image src="/brand/logo-oscuro.png" alt={alt} width={ancho} height={alto} priority={prioridad} unoptimized={sinOptimizar} className={`solo-oscuro ${className ?? ""}`} />
      <Image src="/brand/logo-claro.png" alt={alt} width={ancho} height={alto} priority={prioridad} unoptimized={sinOptimizar} className={`solo-claro ${className ?? ""}`} />
    </>
  );
}
