"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listWorkflows, runWorkflow } from "@/lib/api-client";
import type { Workflow } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";

// Dashboard: lista de workflows reales del backend, con boton para ejecutar cada uno ahora.
// Cambio en la Fase 2: la ejecucion ya no es sincrona (se encola via BullMQ), asi que "Ejecutar"
// ya no puede mostrar el resultado inline en la fila — navega directo al timeline del run (que
// arranca en 'running' y se actualiza solo por polling, ver runs/[id]/page.tsx).
export default function DashboardPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => {
    listWorkflows()
      .then(setWorkflows)
      .catch((err) => setLoadError(err instanceof Error ? err.message : String(err)));
  }, []);

  // Dispara la ejecucion real de un workflow y navega a su timeline en cuanto el backend confirma el run creado.
  async function handleRun(id: string) {
    setRunningId(id);
    setRunError(null);
    try {
      const run = await runWorkflow(id);
      router.push(`/runs/${run.id}`);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : String(err));
      setRunningId(null);
    }
  }

  if (loadError) {
    return (
      <div className="p-10">
        <p className="text-sm text-pink">No se pudo cargar la lista de workflows: {loadError}</p>
        <p className="mt-2 text-sm text-muted">¿Está corriendo el backend en {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"}?</p>
      </div>
    );
  }

  if (!workflows) {
    return <div className="p-10 text-sm text-muted">Cargando workflows…</div>;
  }

  const total = workflows.length;
  const activos = workflows.filter((w) => w.status === "active").length;

  return (
    <div className="mx-auto max-w-6xl px-10 py-9">
      <div className="mb-7 flex items-center justify-between">
        <div>
          <span className="mb-3 inline-block rounded bg-violet-bg px-2.5 py-1 font-mono text-[11px] font-bold tracking-wider text-[#c9c1ff]">
            {total} WORKFLOWS · {activos} ACTIVOS
          </span>
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight">
            Tus automatizaciones,
            <br />
            de un vistazo<span className="text-lime">.</span>
          </h1>
        </div>
        <Link
          href="/workflows/new"
          className="flex items-center gap-2 rounded-full bg-lime px-5 py-2.5 text-sm font-bold text-lime-ink"
        >
          + Nuevo workflow
        </Link>
      </div>

      {runError && <p className="mb-4 rounded-lg bg-pink-bg px-4 py-3 text-sm text-pink">{runError}</p>}

      {workflows.length === 0 && (
        <div className="rounded-xl border border-dashed border-hairline p-10 text-center text-sm text-muted">
          Todavía no creaste ningún workflow. <Link href="/workflows/new" className="text-lime">Creá el primero</Link>.
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {workflows.map((workflow) => (
          <div key={workflow.id} className="flex items-center gap-4 rounded-xl border-l-[5px] border-l-lime bg-surface px-5 py-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <Link href={`/workflows/${workflow.id}`} className="text-[15px] font-bold hover:text-lime">
                  {workflow.name}
                </Link>
                <span className="rounded bg-faint px-2 py-0.5 font-mono text-[11px] text-muted">
                  {workflow.triggerType === "scheduled" ? workflow.cronExpression : "manual"}
                </span>
              </div>
              <div className="mt-1 text-sm text-muted">
                {workflow.steps.length} paso{workflow.steps.length === 1 ? "" : "s"}
              </div>
            </div>

            <StatusBadge tone={workflow.status === "active" ? "lime" : "faint"}>
              {workflow.status === "active" ? "Activo" : workflow.status === "paused" ? "Pausado" : "Borrador"}
            </StatusBadge>

            <button
              type="button"
              onClick={() => handleRun(workflow.id)}
              disabled={workflow.steps.length === 0 || runningId === workflow.id}
              className="text-sm font-bold text-lime disabled:cursor-not-allowed disabled:text-muted"
            >
              {runningId === workflow.id ? "Ejecutando…" : "Ejecutar >"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
