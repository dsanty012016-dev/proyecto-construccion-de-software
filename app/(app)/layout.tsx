// Marco de la zona privada. En la fase 3 lleva la barra inferior (Inicio,
// Viajes, Wallet, Perfil); por ahora solo la columna de celular.
export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto min-h-dvh w-full max-w-md px-6 py-10">{children}</div>;
}
