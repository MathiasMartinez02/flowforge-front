"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getWorkflow, listRuns, runWorkflow } from "@/lib/api-client";
import type { Workflow, WorkflowRun } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDuration, formatRelativeTime } from "@/lib/format";

// Etiqueta + resumen de un paso para la cadena horizontal de "Pasos" (ver design DetalleWorkflow.dc.html).
function stepSummary(step: Workflow["steps"][number]): { label: string; detail: string } {
  if (step.stepType === "condition") {
    const cfg = step.config as { field?: string; operator?: string; value?: unknown };
    return { label: "Condición", detail: `${cfg.field ?? ""} ${cfg.operator ?? ""} ${cfg.value ?? ""}`.trim() };
  }
  if (step.actionType === "notification") {
    const cfg = step.config as { to?: string };
    return { label: "Notificación", detail: String(cfg.to ?? "") };
  }
  const cfg = step.config as { method?: string; url?: string };
  return { label: "HTTP Request", detail: `${cfg.method ?? ""} ${cfg.url ?? ""}`.trim() };
}

const RUN_STATUS_LABEL: Record<WorkflowRun["status"], string> = {
  completed: "Completado",
  failed: "Fallido",
  running: "Corriendo",
  pending: "Pendiente",
};

const RUN_STATUS_TONE: Record<WorkflowRun["status"], "lime" | "pink" | "violet"> = {
  completed: "lime",
  failed: "pink",
  running: "violet",
  pending: "violet",
};

// Detalle de un workflow: cadena de pasos + historial de runs con link al timeline de cada uno.
export default function WorkflowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [runs, setRuns] = useState<WorkflowRun[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    Promise.all([getWorkflow(id), listRuns(id)])
      .then(([wf, history]) => {
        setWorkflow(wf);
        setRuns(history);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [id]);

  // Dispara una ejecucion y navega directo al timeline del run recien creado (todavia 'running', se ve en vivo por polling).
  async function handleRun() {
    setRunning(true);
    try {
      const run = await runWorkflow(id);
      router.push(`/runs/${run.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setRunning(false);
    }
  }

  if (error) {
    return <div className="p-10 text-sm text-pink">No se pudo cargar el workflow: {error}</div>;
  }
  if (!workflow || !runs) {
    return <div className="p-10 text-sm text-muted">Cargando…</div>;
  }

  const lastRun = runs[0];

  return (
    <div className="mx-auto max-w-4xl px-6 py-9">
      <div className="mb-5 flex items-center gap-2 text-sm text-muted">
        <Link href="/" className="hover:text-lime">
          Workflows
        </Link>
        <span>/</span>
        <span className="font-bold text-foreground">{workflow.name}</span>
      </div>

      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <div className="mb-2.5 flex items-center gap-2.5">
            <StatusBadge tone={workflow.status === "active" ? "lime" : "faint"}>
              {workflow.status === "active" ? "Activo" : workflow.status === "paused" ? "Pausado" : "Borrador"}
            </StatusBadge>
            {workflow.triggerType === "scheduled" && (
              <span className="rounded bg-faint px-2.5 py-1 font-mono text-xs text-muted">{workflow.cronExpression}</span>
            )}
          </div>
          <h1 className="font-display text-[32px] font-bold tracking-tight">{workflow.name}</h1>
          {workflow.description && <p className="mt-2 max-w-lg text-sm text-muted">{workflow.description}</p>}
        </div>

        <div className="flex flex-shrink-0 flex-col items-end gap-4">
          {lastRun && (
            <div className="text-right">
              <div className="text-[11px] font-bold tracking-wide text-muted">ÚLTIMA EJECUCIÓN</div>
              <div className="mt-1 text-sm font-semibold">{formatRelativeTime(lastRun.startedAt)}</div>
            </div>
          )}
          <button
            type="button"
            onClick={handleRun}
            disabled={workflow.steps.length === 0 || running}
            className="rounded-full bg-lime px-5 py-2.5 text-sm font-bold text-lime-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? "Ejecutando…" : "Ejecutar ahora"}
          </button>
        </div>
      </div>

      <section className="mb-6 rounded-2xl bg-surface p-6">
        <h2 className="mb-[18px] font-display text-[15px] font-bold">Pasos</h2>
        {workflow.steps.length === 0 ? (
          <p className="text-sm text-muted">Este workflow todavía no tiene pasos.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-0">
            {workflow.steps.map((step, index) => {
              const { label, detail } = stepSummary(step);
              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex items-center gap-2.5 rounded-[10px] border border-hairline bg-background px-4 py-3">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-violet text-[11px] font-bold text-white">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold">{label}</div>
                      <div className="truncate font-mono text-[11px] text-muted">{detail}</div>
                    </div>
                  </div>
                  {index < workflow.steps.length - 1 && <div className="h-0.5 w-8 flex-shrink-0 bg-hairline" />}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <h2 className="mb-3.5 font-display text-[15px] font-bold">Historial de ejecuciones</h2>
      {runs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-hairline p-8 text-center text-sm text-muted">
          Todavía no se ejecutó este workflow.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {runs.map((run) => (
            <Link
              key={run.id}
              href={`/runs/${run.id}`}
              className={`flex items-center gap-4 rounded-xl border-l-[5px] bg-surface px-5 py-3.5 ${
                run.status === "failed" ? "border-l-pink" : run.status === "completed" ? "border-l-lime" : "border-l-violet"
              }`}
            >
              <span className="w-[86px] font-mono text-xs text-muted">#{run.id.slice(0, 8)}</span>
              <div className="flex-1">
                <StatusBadge tone={RUN_STATUS_TONE[run.status]}>{RUN_STATUS_LABEL[run.status]}</StatusBadge>
              </div>
              <span className="w-[110px] text-xs text-muted">{formatRelativeTime(run.startedAt)}</span>
              <span className="w-[60px] text-xs text-muted">{formatDuration(run.startedAt, run.finishedAt)}</span>
              <span className="text-sm font-bold text-lime">Ver timeline &gt;</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
