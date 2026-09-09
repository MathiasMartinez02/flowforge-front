"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listWorkflows, runWorkflow } from "@/lib/api-client";
import type { Workflow, WorkflowRun } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";

// Estado de ejecucion de un workflow puntual desde la lista (por fila, no global).
interface RunState {
  loading: boolean;
  lastRun?: WorkflowRun;
  error?: string;
}

// Dashboard: lista de workflows reales del backend, con boton para ejecutar cada uno ahora.
export default function DashboardPage() {
  const [workflows, setWorkflows] = useState<Workflow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [runStates, setRunStates] = useState<Record<string, RunState>>({});

  useEffect(() => {
    listWorkflows()
      .then(setWorkflows)
      .catch((err) => setLoadError(err instanceof Error ? err.message : String(err)));
  }, []);

  // Dispara la ejecucion real de un workflow y guarda el resultado para mostrarlo inline en su fila.
  async function handleRun(id: string) {
    setRunStates((prev) => ({ ...prev, [id]: { loading: true } }));
    try {
      const run = await runWorkflow(id);
      setRunStates((prev) => ({ ...prev, [id]: { loading: false, lastRun: run } }));
    } catch (err) {
      setRunStates((prev) => ({
        ...prev,
        [id]: { loading: false, error: err instanceof Error ? err.message : String(err) },
      }));
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

      {workflows.length === 0 && (
        <div className="rounded-xl border border-dashed border-hairline p-10 text-center text-sm text-muted">
          Todavía no creaste ningún workflow. <Link href="/workflows/new" className="text-lime">Creá el primero</Link>.
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {workflows.map((workflow) => {
          const runState = runStates[workflow.id];
          const borderTone = runState?.lastRun?.status === "failed" || runState?.error ? "border-l-pink" : "border-l-lime";

          return (
            <div key={workflow.id} className={`flex items-center gap-4 rounded-xl border-l-[5px] bg-surface px-5 py-4 ${borderTone}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-[15px] font-bold">{workflow.name}</span>
                  <span className="rounded bg-faint px-2 py-0.5 font-mono text-[11px] text-muted">
                    {workflow.triggerType === "scheduled" ? workflow.cronExpression : "manual"}
                  </span>
                </div>
                <div className="mt-1 text-sm text-muted">
                  {workflow.steps.length} paso{workflow.steps.length === 1 ? "" : "s"}
                  {runState?.lastRun && (
                    <>
                      {" · "}
                      {runState.lastRun.status === "completed" ? "Completado" : "Fallido"} recién
                    </>
                  )}
                  {runState?.error && <span className="text-pink"> · {runState.error}</span>}
                </div>
              </div>

              <StatusBadge tone={workflow.status === "active" ? "lime" : "faint"}>
                {workflow.status === "active" ? "Activo" : workflow.status === "paused" ? "Pausado" : "Borrador"}
              </StatusBadge>

              <button
                type="button"
                onClick={() => handleRun(workflow.id)}
                disabled={workflow.steps.length === 0 || runState?.loading}
                className="text-sm font-bold text-lime disabled:cursor-not-allowed disabled:text-muted"
              >
                {runState?.loading ? "Ejecutando…" : "Ejecutar >"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
