import Image from "next/image";

// Marco de foto de la portada. Las fotos van a dos tintas (azul noche y azul
// UniGo, ver portada.css) para que combinen con la marca aunque vengan de
// cámaras distintas. Sin "src" se ve un marco rayado que dice qué foto falta:
// para ponerla, guárdala en public/fotos/ y pasa su ruta en "src".
export function Foto({
  src,
  alt,
  falta,
  className = "",
  children,
}: {
  src?: string;
  /** Qué se ve en la foto, para quien usa lector de pantalla. */
  alt: string;
  /** Qué foto va aquí, mientras no esté. */
  falta: string;
  className?: string;
  children?: React.ReactNode;
}) {
  if (!src) {
    return (
      <div className={`foto ${className}`} data-pendiente>
        <span>Foto pendiente: {falta}</span>
        {children}
      </div>
    );
  }
  return (
    <div className={`foto ${className}`}>
      <Image src={src} alt={alt} fill sizes="(min-width: 60rem) 50vw, 100vw" />
      {children}
    </div>
  );
}
