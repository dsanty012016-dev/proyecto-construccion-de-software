import { perfilActual } from "@/app/lib/sesion";
import { BarraInferior } from "@/app/ui/comun/barra-inferior";

// Marco de la zona privada: columna de celular y barra inferior según el rol.
// Sin rol (cuenta nueva) no hay barra: primero tiene que elegir.
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const { perfil } = await perfilActual();
  return (
    <div className="mx-auto min-h-dvh w-full max-w-md pb-24">
      {children}
      {perfil?.rol && <BarraInferior rol={perfil.rol} />}
    </div>
  );
}
