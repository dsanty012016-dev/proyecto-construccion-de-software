import type { Metadata } from "next";
import { CORREOS_PRIVACIDAD, ENLACE_CORREO_PRIVACIDAD, VERSION_POLITICA } from "@/app/lib/privacidad";
import { SECCION } from "@/app/ui/sitio/estilos";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Qué datos guarda UniGo, para qué, quién los ve y cómo pedir que los corrijamos o borremos (Ley 1581 de 2012).",
};

// Política de tratamiento de datos personales (Ley 1581 de 2012 y Decreto
// 1377 de 2013). Debe decir exactamente lo que la app hace: si cambia cómo se
// usan los datos, se cambia este texto y la fecha en app/lib/privacidad.ts
// (y todos la vuelven a aceptar).

const VERSION_LEGIBLE = "25 de octubre de 2026";

function Bloque({ id, titulo, children }: { id: string; titulo: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-3 border-t border-texto-suave/15 pt-8">
      <h2 id={id} className="text-2xl tracking-tight">
        {titulo}
      </h2>
      <div className="space-y-3 text-[17px] leading-relaxed text-texto-suave [&_strong]:text-texto">{children}</div>
    </section>
  );
}

export default function PaginaPrivacidad() {
  return (
    <article className={`${SECCION} max-w-[760px] space-y-8 pt-8 pb-12`}>
      <header className="space-y-3">
        <h1 className="text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.05] font-extrabold tracking-[-0.03em]">Política de privacidad</h1>
        <p className="text-texto-suave">
          Versión del {VERSION_LEGIBLE} <span className="sr-only">({VERSION_POLITICA})</span>. Explica qué datos tuyos guarda UniGo, para qué, quién
          los ve y cómo pedirnos que los corrijamos o borremos, según la Ley 1581 de 2012 y el Decreto 1377 de 2013.
        </p>
      </header>

      <Bloque id="quienes" titulo="Quiénes somos">
        <p>
          UniGo es un <strong>proyecto académico</strong> de Dilan Santiago Chavarro Parra y David Eduardo Durán Acevedo, estudiantes de la Universidad
          Santo Tomás, seccional Villavicencio. Nosotros dos somos los responsables de tus datos; la universidad no administra UniGo.
        </p>
        <p>
          Para cualquier tema de tus datos escríbenos a{" "}
          <a href={ENLACE_CORREO_PRIVACIDAD} className="font-semibold">
            {CORREOS_PRIVACIDAD.join(" y ")}
          </a>{" "}
          (el enlace nos escribe a los dos).
        </p>
      </Bloque>

      <Bloque id="datos" titulo="Qué datos guardamos">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Tu cuenta:</strong> nombre, correo institucional, celular y si usas la app como estudiante o conductor. Tu contraseña la guarda
            cifrada nuestro proveedor; nosotros no la podemos ver.
          </li>
          <li>
            <strong>Tus viajes y cupos:</strong> dónde te recogen y a dónde vas, horas, precios, ofertas, calificaciones, comentarios y reportes.
          </li>
          <li>
            <strong>Ubicación en vivo:</strong> solo la del conductor, solo mientras un viaje o cupo está en marcha, cada 5 segundos. Guardamos
            únicamente la última y se borra cuando el viaje termina o se cancela. A los estudiantes no los rastreamos: solo guardamos el punto de
            recogida que eligen.
          </li>
          <li>
            <strong>Si conduces:</strong> los datos de tu vehículo (placa, marca, modelo y color) y las fotos o PDF de tu cédula, licencia de conducción y
            tarjeta de propiedad. La foto de tu rostro en esos documentos es un <strong>dato sensible</strong>: entregarla es voluntario, pero sin
            ella no podemos verificarte como conductor.
          </li>
          <li>
            <strong>Billetera:</strong> tu saldo de prueba, los movimientos, strikes y suspensiones. Durante el piloto no se usa dinero real.
          </li>
        </ul>
      </Bloque>

      <Bloque id="para-que" titulo="Para qué los usamos">
        <ul className="list-disc space-y-2 pl-5">
          <li>Conectar a estudiantes que van a la universidad con conductores de la misma universidad.</li>
          <li>Verificar a los conductores antes de su primer viaje.</li>
          <li>Mostrarle a la otra persona del viaje lo necesario para encontrarse y viajar seguros.</li>
          <li>Cuidar la seguridad: reportes de mal comportamiento, strikes y suspensiones.</li>
          <li>Llevar las cuentas de la billetera de prueba.</li>
        </ul>
        <p>No vendemos tus datos ni los usamos para publicidad.</p>
      </Bloque>

      <Bloque id="quien-ve" titulo="Quién ve tus datos">
        <ul className="list-disc space-y-2 pl-5">
          <li>Los conductores disponibles de tu universidad ven tu punto de recogida y tu nombre corto cuando pides un viaje, para poder ofertar.</li>
          <li>
            Tu celular solo lo ve la otra persona de un viaje o cupo <strong>activo</strong>, y deja de verlo cuando termina.
          </li>
          <li>
            Si compartes tu viaje, quien tenga el enlace ve nombres cortos, el vehículo, la placa, el recorrido y la ubicación del conductor, nunca
            teléfonos. El enlace deja de funcionar al terminar.
          </li>
          <li>Los administradores de UniGo (nosotros dos) vemos los documentos de los conductores y los reportes, para revisarlos.</li>
        </ul>
      </Bloque>

      <Bloque id="proveedores" titulo="Con quién los compartimos">
        <p>Para que UniGo funcione usamos estos servicios, que reciben datos solo para prestarnos su servicio:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Supabase</strong> (base de datos, inicio de sesión y archivos), con servidores en Estados Unidos.
          </li>
          <li>
            <strong>Vercel</strong> (donde se publica la app), en Estados Unidos.
          </li>
          <li>
            <strong>OpenFreeMap</strong> (los mapas): recibe qué zona del mapa estás viendo.
          </li>
          <li>
            <strong>FOSSGIS / OpenStreetMap</strong> (las rutas por las calles), en Alemania: recibe el punto de recogida y el destino para trazar
            el camino.
          </li>
        </ul>
        <p>Al aceptar esta política autorizas que tus datos se envíen a estos países para esos fines.</p>
      </Bloque>

      <Bloque id="tiempo" titulo="Cuánto tiempo los guardamos">
        <p>
          Mientras tu cuenta exista y dure el piloto académico. Si pides borrar tus datos, los eliminamos en máximo 15 días hábiles. Cuando termine
          el proyecto, borramos todos los datos. La ubicación en vivo se borra apenas termina cada viaje.
        </p>
      </Bloque>

      <Bloque id="derechos" titulo="Tus derechos">
        <p>Según el artículo 8 de la Ley 1581 de 2012, puedes:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Conocer, actualizar y corregir tus datos.</li>
          <li>Pedir prueba de que nos autorizaste y saber cómo los usamos.</li>
          <li>Retirar tu autorización o pedir que borremos tus datos.</li>
          <li>Consultarlos gratis.</li>
          <li>Quejarte ante la Superintendencia de Industria y Comercio si no cumplimos.</li>
        </ul>
        <p>
          Escríbenos desde tu correo institucional a{" "}
          <a href={ENLACE_CORREO_PRIVACIDAD} className="font-semibold">
            {CORREOS_PRIVACIDAD.join(" y ")}
          </a>
          . Respondemos las consultas en máximo 10 días hábiles y los reclamos en máximo 15 días hábiles.
        </p>
      </Bloque>

      <Bloque id="menores" titulo="Menores de edad">
        <p>
          UniGo es para estudiantes universitarios. Si tienes menos de 18 años, tu madre, padre o representante legal debe autorizar el uso de tus
          datos antes de que uses la app.
        </p>
      </Bloque>

      <Bloque id="seguridad" titulo="Cómo los protegemos">
        <p>
          Cada persona solo puede leer lo que le corresponde (las reglas viven en la base de datos, no solo en la pantalla). Los documentos de los
          conductores se guardan en un espacio privado y se abren con enlaces que vencen en 5 minutos. Las contraseñas se guardan cifradas.
        </p>
      </Bloque>

      <Bloque id="cambios" titulo="Cambios a esta política">
        <p>Si cambiamos cómo usamos tus datos, actualizamos esta página con una nueva fecha y te pedimos aceptarla otra vez antes de seguir.</p>
      </Bloque>
    </article>
  );
}
