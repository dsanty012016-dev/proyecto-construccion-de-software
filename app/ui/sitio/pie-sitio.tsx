import Image from "next/image";

// Cierre del sitio: invitación a unirse (el registro llega en la fase 2) y
// el pie con el contacto del equipo.
const CORREO_EQUIPO = "contact.unigocol@gmail.com";

export function Unete() {
  return (
    <section id="unete" aria-labelledby="titulo-unete" className="px-4 pt-28 pb-24 sm:px-6 sm:pt-36 sm:pb-32">
      <div className="mx-auto max-w-3xl text-center">
        <Image
          src="/brand/icono-oscuro.png"
          alt=""
          width={314}
          height={412}
          className="mx-auto h-20 w-auto"
        />
        <h2
          id="titulo-unete"
          className="mt-8 text-[clamp(2.5rem,7vw,4.75rem)] leading-[0.98] font-extrabold tracking-[-0.045em] text-balance"
        >
          Muy pronto en tu celular.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-texto-suave text-pretty">
          El registro abrirá para correos @ustavillavo.edu.co. UniGo se instala
          desde el navegador, como una app, sin pasar por una tienda.
        </p>
        <a
          href={`mailto:${CORREO_EQUIPO}?subject=Quiero%20usar%20UniGo`}
          className="mt-9 inline-flex min-h-12 items-center justify-center rounded-full bg-primario px-7 font-semibold text-texto transition-colors hover:bg-primario/85"
        >
          Escríbele al equipo
        </a>
      </div>
    </section>
  );
}

export function PieSitio() {
  return (
    <footer className="border-t border-linea px-4 py-12 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Image src="/brand/logo-oscuro.png" alt="UniGo" width={1170} height={412} className="h-9 w-auto" />
          <p className="mt-4 text-sm text-texto-suave">Tu viaje, tu universidad.</p>
        </div>
        <div className="text-sm text-texto-suave sm:text-right">
          <p>
            <a href={`mailto:${CORREO_EQUIPO}`} className="inline-flex min-h-11 items-center">
              {CORREO_EQUIPO}
            </a>
          </p>
          <p>Villavicencio, Colombia</p>
          <p className="mt-4">© 2026 UniGo. Proyecto académico, Universidad Santo Tomás.</p>
        </div>
      </div>
    </footer>
  );
}
