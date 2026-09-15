import Link from "next/link";
import { Logo } from "@/components/Logo";

// Topbar compartido por las pantallas del dashboard: logo + link al repo. El link "Nuevo workflow" lo agrega cada pantalla.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-hairline px-10 py-5">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <span className="font-display text-lg font-bold tracking-tight">FlowForge</span>
          </Link>
          {/* Agregado en la Fase 4: link a la pantalla de integraciones (conexion con GitHub). */}
          <Link href="/integrations" className="text-sm text-muted hover:text-lime">
            Integraciones
          </Link>
        </div>
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="text-sm text-muted hover:text-lime"
        >
          Repositorio
        </a>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
