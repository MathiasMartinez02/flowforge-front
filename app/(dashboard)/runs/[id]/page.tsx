"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getRun, runWorkflow } from "@/lib/api-client";
import type { WorkflowRun } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { RunTimeline } from "@/components/RunTimeline";
import { formatClock, formatDuration } from "@/lib/format";

const STATUS_LABEL: Record<WorkflowRun["status"], string> = {
  completed: "Completado",
  failed: "Fallido",
  running: "Corriendo",
  pending: "Pendiente",
};

const STATUS_TONE: Record<WorkflowRun["status"], "lime" | "pink" | "violet"> = {
  completed: "lime",
  failed: "pink",
  running: "violet",
  pending: "violet",
};

// Detalle de una ejecucion: header con inicio/fin/duracion + timeline por paso.
// Como la ejecucion ahora es asincrona (Fase 2, cola BullMQ), esta pantalla poll-ea GET /runs/:id
// cada 1.5s mientras el run siga 'pending'/'running' — se corta sola al llegar a un estado final.
export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const data = await getRun(id);
        if (cancelled) return;
        setRun(data);
        if (data.status === "pending" || data.status === "running") {
          timer = setTimeout(poll, 1500);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id]);

  async function handleRetry() {
    if (!run?.workflow?.id) return;
    setRetrying(true);
    try {
      const newRun = await runWorkflow(run.workflow.id);
      router.push(`/runs/${newRun.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setRetrying(false);
    }
  }

  if (error) {
    return <div className="p-10 text-sm text-pink">No se pudo cargar la ejecución: {error}</div>;
  }
  if (!run) {
    return <div className="p-10 text-sm text-muted">Cargando…</div>;
  }

  const workflow = run.workflow;
  const failedStep = run.stepRuns.find((s) => s.status === "failed");
  const inProgress = run.status === "pending" || run.status === "running";

  return (
    <div className="mx-auto max-w-3xl px-6 py-9">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {workflow ? (
            <Link href={`/workflows/${workflow.id}`} className="hover:text-lime">
              {workflow.name}
            </Link>
          ) : (
            <span>Workflow</span>
          )}
          <span>/</span>
          <span className="font-mono font-bold text-foreground">#{run.id.slice(0, 8)}</span>
        </div>
        <button
          type="button"
          onClick={handleRetry}
          disabled={retrying || !run.workflow?.id}
          className="rounded-full border border-hairline px-4 py-2 text-sm font-bold text-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          {retrying ? "Reintentando…" : "Reintentar workflow"}
        </button>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-3">
        <StatusBadge tone={STATUS_TONE[run.status]}>{STATUS_LABEL[run.status]}</StatusBadge>
        <span className="font-mono text-xs text-muted">#{run.id.slice(0, 8)}</span>
        <span className="text-xs text-muted">
          · disparado por {run.triggerSource === "manual" ? "manual" : run.triggerSource === "scheduled" ? "programación" : "webhook"}
        </span>
      </div>
      <h1 className="mb-5 font-display text-[30px] font-bold tracking-tight">Ejecución del workflow</h1>

      <div className="mb-8 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <div className="rounded-xl bg-surface px-4 py-3.5">
          <div className="text-[11px] font-bold tracking-wide text-muted">INICIO</div>
          <div className="mt-1.5 font-mono text-sm font-semibold">{formatClock(run.startedAt)}</div>
        </div>
        <div className="rounded-xl bg-surface px-4 py-3.5">
          <div className="text-[11px] font-bold tracking-wide text-muted">FIN</div>
          <div className="mt-1.5 font-mono text-sm font-semibold">{inProgress ? "-" : formatClock(run.finishedAt)}</div>
        </div>
        <div className="rounded-xl bg-surface px-4 py-3.5">
          <div className="text-[11px] font-bold tracking-wide text-muted">DURACIÓN</div>
          <div className="mt-1.5 font-mono text-sm font-semibold">{formatDuration(run.startedAt, run.finishedAt)}</div>
        </div>
        <div className={`rounded-xl px-4 py-3.5 ${failedStep ? "bg-pink-bg" : "bg-surface"}`}>
          <div className={`text-[11px] font-bold tracking-wide ${failedStep ? "text-pink" : "text-muted"}`}>
            {failedStep ? "PASO FALLIDO" : inProgress ? "EN CURSO" : "ESTADO"}
          </div>
          <div className={`mt-1.5 text-sm font-semibold ${failedStep ? "text-pink" : ""}`}>
            {failedStep ? `${failedStep.workflowStep.orderIndex + 1}. ${failedStep.workflowStep.actionType ?? "condición"}` : STATUS_LABEL[run.status]}
          </div>
        </div>
      </div>

      <RunTimeline run={run} />
    </div>
  );
}
