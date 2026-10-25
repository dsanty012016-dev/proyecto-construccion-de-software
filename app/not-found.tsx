import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "No encontramos esa página" };

// Página para direcciones que no existen (o enlaces compartidos que ya no
// sirven). Lleva a la entrada de siempre en vez de dejar a la persona perdida.
export default function NoEncontrada() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-5 px-5 text-center">
      <p aria-hidden="true" className="font-titulo text-6xl font-extrabold tracking-tight text-secundario">
        404
      </p>
      <h1 className="text-2xl tracking-tight">Esta página no existe</h1>
      <p className="text-texto-suave">Puede que el enlace esté mal escrito o que ya no funcione. Si te compartieron un viaje, pídele a esa persona un enlace nuevo.</p>
      <Link href="/" className="mx-auto inline-flex min-h-12 items-center rounded-full bg-primario px-6 font-titulo font-semibold text-texto hover:bg-primario/85">
        Ir al inicio
      </Link>
    </main>
  );
}
