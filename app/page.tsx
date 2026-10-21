import Image from "next/image";

// Pantalla de inicio (mockup "Inicio"): el logo centrado sobre el fondo azul
// noche. Más adelante esta página decide a dónde mandar a cada persona según
// tenga sesión y su rol (estudiante o conductor).
export default function InicioPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <h1 className="sr-only">UniGo: tu viaje, tu universidad</h1>
      <Image
        src="/brand/logo-oscuro.png"
        alt="UniGo, tu viaje, tu universidad"
        width={1170}
        height={412}
        priority
        className="h-auto w-full max-w-sm"
      />
    </main>
  );
}
