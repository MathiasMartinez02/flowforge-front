import type { StepRun, WorkflowRun } from "@/lib/types";
import { formatClock, formatDuration, formatMs } from "@/lib/format";

// Debe coincidir con { attempts: 3 } configurado en workflow.producer.ts del backend (BullMQ).
// El backend no expone este numero por endpoint todavia, asi que queda hardcodeado aca a proposito.
const MAX_ATTEMPTS = 3;

// Backoff exponencial (base 2000ms) configurado en el mismo producer: 2s antes del intento 2, 4s antes del 3.
function backoffAfterAttempt(attempt: number): string | null {
  if (attempt >= MAX_ATTEMPTS) return null;
  const delayMs = 2000 * 2 ** (attempt - 1);
  return formatMs(delayMs);
}

// Ampliado en la Fase 4: se suman "ai_task" y "github" (antes caian al default "HTTP Request").
function stepLabel(stepRun: StepRun): string {
  const { stepType, actionType } = stepRun.workflowStep;
  if (stepType === "condition") return "Condición";
  if (actionType === "notification") return "Notificación";
  if (actionType === "ai_task") return "IA";
  if (actionType === "github") return "GitHub";
  return "HTTP Request";
}

// Linea mono debajo del titulo del paso: resumen del resultado (o del error) segun el tipo de paso.
// Ampliado en la Fase 4: "ai_task" y "github" tenian su propio shape de output/config, no method/url
// como http_request — sin este branch mostraban "-> ok" o texto vacio en vez del resultado real.
function stepDetail(stepRun: StepRun): string {
  const { workflowStep, output, errorMessage } = stepRun;

  if (workflowStep.stepType === "condition") {
    const cfg = workflowStep.config as { field?: string; operator?: string; value?: unknown };
    const passed = output?.result === true;
    return `${cfg.field} ${cfg.operator} ${cfg.value} -> ${passed ? "verdadero, continúa" : "falso, corta la cadena"}`;
  }

  if (workflowStep.actionType === "notification") {
    const cfg = workflowStep.config as { to?: string };
    return stepRun.status === "completed" ? `Email enviado a ${cfg.to}` : `Error enviando a ${cfg.to}${errorMessage ? `: ${errorMessage}` : ""}`;
  }

  if (workflowStep.actionType === "ai_task") {
    if (stepRun.status === "completed") {
      const response = String(output?.response ?? "");
      return response.length > 80 ? `${response.slice(0, 80)}…` : response;
    }
    return errorMessage ?? "Error ejecutando el paso de IA";
  }

  if (workflowStep.actionType === "github") {
    const cfg = workflowStep.config as { repo?: string; githubAction?: string };
    if (stepRun.status === "completed") return `${cfg.repo ?? ""} -> ${String(output?.url ?? "ok")}`;
    return errorMessage ? `${cfg.repo ?? ""} -> ${errorMessage}` : (cfg.repo ?? "");
  }

  const cfg = workflowStep.config as { method?: string; url?: string };
  const base = `${cfg.method ?? ""} ${cfg.url ?? ""}`.trim();
  if (stepRun.status === "completed") return `${base} -> ${output?.statusCode ?? "ok"}`;
  return errorMessage ? `${base} -> ${errorMessage}` : base;
}

const CHECK_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lime-ink)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const CROSS_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lime-ink)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
const CLOCK_ICON = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </svg>
);
const SKIP_ICON = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.2" strokeLinecap="round">
    <path d="M5 12h14" />
  </svg>
);

// Timeline vertical de un run: nodo del disparador + un nodo por step_run, con el log de intentos
// cuando un paso tuvo reintentos fallidos (ver step_run.output.attempts en workflow-engine.service.ts).
export function RunTimeline({ run }: { run: WorkflowRun }) {
  return (
    <div className="flex flex-col">
      <div className="flex gap-[18px]">
        <div className="flex flex-shrink-0 flex-col items-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-faint">{CLOCK_ICON}</div>
          <div className="my-0.5 w-0.5 flex-1 bg-hairline" />
        </div>
        <div className="pb-[22px]">
          <div className="text-sm font-bold">
            Disparador: {run.triggerSource === "manual" ? "manual" : run.triggerSource === "scheduled" ? "programado" : "webhook"}
          </div>
          <div className="mt-0.5 font-mono text-xs text-muted">{formatClock(run.startedAt)}</div>
        </div>
      </div>

      {run.stepRuns.map((stepRun, index) => {
        const isLast = index === run.stepRuns.length - 1;
        const icon =
          stepRun.status === "completed" ? CHECK_ICON : stepRun.status === "failed" ? CROSS_ICON : stepRun.status === "skipped" ? SKIP_ICON : CLOCK_ICON;
        const nodeBg = stepRun.status === "completed" ? "bg-lime" : stepRun.status === "failed" ? "bg-pink" : "bg-faint";
        const boxTone =
          stepRun.status === "failed" ? "border border-pink bg-pink-bg" : stepRun.status === "skipped" ? "border border-dashed border-hairline opacity-60" : "bg-surface";
        const attempts = stepRun.output?.attempts ?? [];

        return (
          <div key={stepRun.id} className="flex gap-[18px]">
            <div className="flex flex-shrink-0 flex-col items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${nodeBg}`}>{icon}</div>
              {!isLast && <div className="my-0.5 w-0.5 flex-1 bg-hairline" />}
            </div>
            <div className={`flex-1 rounded-[14px] px-5 py-[18px] ${!isLast ? "mb-[18px]" : ""} ${boxTone}`}>
              <div className="flex items-center justify-between">
                <span className={`text-[15px] font-bold ${stepRun.status === "failed" ? "text-pink" : ""}`}>
                  {index + 1}. {stepLabel(stepRun)}
                </span>
                <span className={`font-mono text-xs ${stepRun.status === "failed" ? "text-pink" : "text-muted"}`}>
                  {stepRun.status === "skipped" ? "omitido" : stepRun.status === "pending" ? "en cola" : formatDuration(stepRun.startedAt, stepRun.finishedAt)}
                </span>
              </div>

              {stepRun.status !== "skipped" && stepRun.status !== "pending" && (
                <div className={`mt-1.5 font-mono text-xs ${stepRun.status === "failed" ? "text-[#ffc9d8]" : "text-muted"}`}>{stepDetail(stepRun)}</div>
              )}

              {attempts.length > 0 && (
                <div className="mt-3.5 flex flex-col gap-1.5">
                  {attempts.map((log) => {
                    const backoff = backoffAfterAttempt(log.attempt);
                    return (
                      <div key={log.attempt} className="flex items-center gap-2">
                        <span className="rounded-full bg-pink px-2.5 py-0.5 text-[11px] font-bold text-lime-ink">
                          Intento {log.attempt}/{MAX_ATTEMPTS}
                        </span>
                        <span className="text-[11px] text-[#ffc9d8]">
                          fallo · {formatMs(log.durationMs)}
                          {backoff ? ` · backoff ${backoff}` : " · sin reintentos restantes"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
