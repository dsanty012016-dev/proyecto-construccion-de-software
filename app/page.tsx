import Image from "next/image";
import Link from "next/link";

// Pantalla de inicio (mockup "Inicio"): el logo y las dos entradas a la app.
// Quien ya tiene sesión entra directo desde "Iniciar sesión" (el proxy lo
// manda a /inicio). La landing pública reemplazará esta página más adelante.
export default function InicioPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-10">
      <h1 className="sr-only">UniGo: tu viaje, tu universidad</h1>
      <Image
        src="/brand/logo-oscuro.png"
        alt="UniGo, tu viaje, tu universidad"
        width={1170}
        height={412}
        priority
        className="h-auto w-full"
      />
      <div className="mt-16 space-y-3">
        <Link
          href="/entrar"
          className="flex h-12 items-center justify-center rounded-xl bg-primario font-semibold text-texto transition-colors hover:bg-primario/85"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/registro"
          className="flex h-12 items-center justify-center rounded-xl border border-superficie font-semibold text-texto transition-colors hover:bg-superficie"
        >
          Crear cuenta
        </Link>
      </div>
    </main>
  );
}
