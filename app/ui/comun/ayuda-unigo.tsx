import { enlaceDeAyuda, type MotivoDeAyuda } from "@/app/lib/ayuda";

const estiloEnlace = "inline-flex min-h-11 items-center font-semibold text-secundario underline underline-offset-4";

export function EnlaceDeAyuda({ motivo }: { motivo: MotivoDeAyuda }) {
  const href = enlaceDeAyuda(process.env.UNIGO_WHATSAPP_AYUDA, motivo);
  if (!href) return null;

  if (motivo.tipo === "falta") {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={estiloEnlace}>
        Solicitar revisión por WhatsApp
      </a>
    );
  }

  const titulo = motivo.tipo === "general" ? "Ayuda de UniGo" : "Ayuda con este viaje";
  return (
    <details className="rounded-2xl border border-texto-suave/25 px-4">
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-secundario">{titulo}</summary>
      <div className="space-y-2 border-t border-texto-suave/20 pt-3 pb-2 text-sm">
        <p>Escríbele al equipo UniGo por WhatsApp. La respuesta puede tardar.</p>
        {motivo.tipo !== "general" && <p>Si hay una emergencia, llama a los servicios de emergencia.</p>}
        <a href={href} target="_blank" rel="noreferrer" className={estiloEnlace}>Abrir WhatsApp</a>
      </div>
    </details>
  );
}
