import type { Metadata } from "next";
import { Anton, Archivo } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";

const anton = Anton({
  weight: "400",
  variable: "--font-anton",
  subsets: ["latin"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "La Polla del Mundial 2026",
  description: "Predicciones del Mundial 2026 entre amigos",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="es" className={`${anton.variable} ${archivo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[rgba(10,20,16,0.92)] backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <Link href="/" className="font-display text-xl leading-none">
              <span className="text-[var(--grass)]">LA POLLA</span>{" "}
              <span className="text-[var(--cream)]">DEL MUNDIAL</span>{" "}
              <span className="text-[var(--gold)]">26</span>
            </Link>
            {user && (
              <nav className="ml-auto flex items-center gap-1 text-sm">
                <Link href="/" className="rounded-lg px-3 py-1.5 hover:bg-[var(--bg-card)]">
                  Partidos
                </Link>
                <Link href="/tabla" className="rounded-lg px-3 py-1.5 hover:bg-[var(--bg-card)]">
                  Ranking
                </Link>
                <Link href="/premios" className="rounded-lg px-3 py-1.5 hover:bg-[var(--bg-card)]">
                  Premios
                </Link>
                {user.isAdmin && (
                  <Link
                    href="/admin"
                    className="rounded-lg px-3 py-1.5 text-[var(--gold)] hover:bg-[var(--bg-card)]"
                  >
                    Admin
                  </Link>
                )}
                <form action={logout}>
                  <button
                    className="ml-2 cursor-pointer rounded-lg border border-[var(--line)] px-3 py-1.5 text-[var(--muted)] hover:text-[var(--cream)]"
                    title={user.displayName}
                  >
                    Salir
                  </button>
                </form>
              </nav>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-[var(--line)] py-6 text-center text-xs text-[var(--muted)]">
          La Polla del Mundial 2026 · Exacto 5 pts · Ganador 2 pts · Goleador y arquero 10 pts
        </footer>
      </body>
    </html>
  );
}
