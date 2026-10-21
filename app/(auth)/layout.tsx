// Marco de las pantallas de acceso: una columna angosta, como en los mockups
// de celular, centrada también en pantallas grandes.
export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col px-6 py-10">
      {children}
    </main>
  );
}
