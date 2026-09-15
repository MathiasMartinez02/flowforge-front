"use client";

import { useEffect, useState } from "react";
import { disconnectGithub, getGithubStatus, githubAuthorizeUrl } from "@/lib/api-client";
import type { GithubIntegrationStatus } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";

// Pantalla de integraciones (Fase 4): estado real de la conexion de GitHub (OAuth) y como
// configurar la action "ai_task" (que no tiene un flujo de conexion, solo variables de entorno).
// Lee query params a mano (en vez de useSearchParams) para no forzar un boundary de Suspense
// solo por leer "?connected=1"/"?error=..." del redirect del callback de OAuth.
// Lee la query string una sola vez al montar (fuera de un effect, con inicializador perezoso de
// useState) — evita el set-state-in-effect que dispara un render en cascada solo por esto.
function readQueryParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
}

export default function IntegrationsPage() {
  const [status, setStatus] = useState<GithubIntegrationStatus | null>(null);
  const [error, setError] = useState<string | null>(() => readQueryParam("error"));
  const [justConnected] = useState<boolean>(() => readQueryParam("connected") === "1");
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    getGithubStatus()
      .then(setStatus)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnectGithub();
      setStatus({ connected: false, login: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <span className="mb-3.5 inline-block rounded bg-violet-bg px-2.5 py-1 font-mono text-[11px] font-bold tracking-wider text-[#c9c1ff]">
        INTEGRACIONES
      </span>
      <h1 className="mb-8 font-display text-4xl font-bold tracking-tight">
        Conectá tus cuentas<span className="text-lime">.</span>
      </h1>

      {error && <p className="mb-4 rounded-lg bg-pink-bg px-4 py-3 text-sm text-pink">{error}</p>}
      {justConnected && (
        <p className="mb-4 rounded-lg bg-lime/10 px-4 py-3 text-sm text-lime">Cuenta de GitHub conectada correctamente.</p>
      )}

      <section className="mb-5 rounded-2xl bg-surface p-6">
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="font-display text-base font-bold">GitHub</h2>
          {status && (
            <StatusBadge tone={status.connected ? "lime" : "faint"}>{status.connected ? "Conectado" : "Sin conectar"}</StatusBadge>
          )}
        </div>
        <p className="mb-4 text-sm text-muted">
          Usado por la action <span className="font-mono text-xs">github</span> (crear issues o comentar) via OAuth real — el
          token se guarda encriptado (AES-256-GCM) en el backend.
        </p>
        {status?.connected ? (
          <div className="flex items-center justify-between rounded-lg border border-hairline bg-background px-4 py-3">
            <span className="text-sm">
              Conectado como <span className="font-bold">{status.login}</span>
            </span>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-sm font-bold text-pink disabled:opacity-60"
            >
              {disconnecting ? "…" : "Desconectar"}
            </button>
          </div>
        ) : (
          <a
            href={githubAuthorizeUrl()}
            className="inline-flex rounded-full bg-lime px-5 py-2.5 text-sm font-bold text-lime-ink"
          >
            Conectar con GitHub
          </a>
        )}
      </section>

      <section className="rounded-2xl bg-surface p-6">
        <h2 className="mb-3.5 font-display text-base font-bold">Inteligencia artificial</h2>
        <p className="text-sm text-muted">
          La action <span className="font-mono text-xs">ai_task</span> no requiere conexión desde acá: se configura por
          variables de entorno del backend (<span className="font-mono text-xs">AI_PROVIDER</span>,{" "}
          <span className="font-mono text-xs">GEMINI_API_KEY</span> u{" "}
          <span className="font-mono text-xs">OLLAMA_HOST</span>/<span className="font-mono text-xs">OLLAMA_MODEL</span>), igual
          que las credenciales SMTP de la action de notificaciones.
        </p>
      </section>
    </div>
  );
}
