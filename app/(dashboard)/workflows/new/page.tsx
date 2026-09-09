"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createWorkflow } from "@/lib/api-client";
import type { CreateWorkflowStepInput } from "@/lib/types";

type ConditionOperator = "==" | "!=" | ">" | "<" | "contains";

// Borrador de un paso en el formulario, previo a convertirse en CreateWorkflowStepInput al guardar.
// Ampliado en la Fase 2: antes (Fase 1) solo existia el tipo http_request.
type DraftStep =
  | { kind: "http_request"; method: string; url: string }
  | { kind: "condition"; field: string; operator: ConditionOperator; value: string }
  | { kind: "notification"; to: string; subject: string; body: string };

function emptyHttpStep(): DraftStep {
  return { kind: "http_request", method: "GET", url: "" };
}

const OPERATORS: ConditionOperator[] = ["==", "!=", ">", "<", "contains"];

// Formulario de creacion: nombre, trigger (manual/programado) y pasos en orden.
// Modificado en la Fase 2: cada paso ahora elige entre Accion (http_request/notification) o Condicion,
// siguiendo el diseño de CrearWorkflow.dc.html (pill de stepType + pill de actionType dentro de cada tarjeta).
export default function NewWorkflowPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<"manual" | "scheduled">("manual");
  const [cronExpression, setCronExpression] = useState("");
  const [steps, setSteps] = useState<DraftStep[]>([emptyHttpStep()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateStep(index: number, patch: Partial<DraftStep>) {
    setSteps((prev) => prev.map((step, i) => (i === index ? ({ ...step, ...patch } as DraftStep) : step)));
  }

  function setStepKind(index: number, kind: DraftStep["kind"]) {
    setSteps((prev) =>
      prev.map((step, i) => {
        if (i !== index) return step;
        if (kind === "http_request") return { kind, method: "GET", url: "" };
        if (kind === "condition") return { kind, field: "", operator: "==", value: "" };
        return { kind, to: "", subject: "", body: "" };
      }),
    );
  }

  function addStep() {
    setSteps((prev) => [...prev, emptyHttpStep()]);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function validateStep(step: DraftStep): string | null {
    if (step.kind === "http_request" && !step.url.trim()) return "Falta la URL de un paso HTTP Request";
    if (step.kind === "condition" && (!step.field.trim() || !step.value.trim())) return "Falta completar una condición";
    if (step.kind === "notification" && !step.to.trim()) return "Falta el destinatario de una notificación";
    return null;
  }

  function toStepInput(step: DraftStep, orderIndex: number): CreateWorkflowStepInput {
    if (step.kind === "http_request") {
      return { orderIndex, stepType: "action", actionType: "http_request", config: { method: step.method, url: step.url.trim() } };
    }
    if (step.kind === "condition") {
      return { orderIndex, stepType: "condition", config: { field: step.field.trim(), operator: step.operator, value: step.value.trim() } };
    }
    return {
      orderIndex,
      stepType: "action",
      actionType: "notification",
      config: { to: step.to.trim(), subject: step.subject.trim(), body: step.body.trim() },
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Falta el nombre del workflow");
    if (triggerType === "scheduled" && !cronExpression.trim()) return setError("Falta la expresión cron");
    for (const step of steps) {
      const stepError = validateStep(step);
      if (stepError) return setError(stepError);
    }

    const stepsInput = steps.map((step, index) => toStepInput(step, index));

    setSaving(true);
    try {
      const workflow = await createWorkflow({
        name: name.trim(),
        description: description.trim() || undefined,
        triggerType,
        cronExpression: triggerType === "scheduled" ? cronExpression.trim() : undefined,
        steps: stepsInput,
      });
      router.push(`/workflows/${workflow.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl px-6 py-10">
      <span className="mb-3.5 inline-block rounded bg-violet-bg px-2.5 py-1 font-mono text-[11px] font-bold tracking-wider text-[#c9c1ff]">
        NUEVO WORKFLOW
      </span>
      <h1 className="mb-8 font-display text-4xl font-bold tracking-tight">
        Arma tu automatización<span className="text-lime">.</span>
      </h1>

      {error && <p className="mb-4 rounded-lg bg-pink-bg px-4 py-3 text-sm text-pink">{error}</p>}

      <section className="mb-5 rounded-2xl bg-surface p-6">
        <h2 className="mb-[18px] font-display text-base font-bold">Detalles</h2>
        <label className="mb-2 block text-xs font-bold tracking-wide text-muted">NOMBRE DEL WORKFLOW</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Chequeo de salud de API"
          className="mb-4 w-full rounded-lg border border-hairline bg-background px-3.5 py-2.5 text-sm outline-none focus:border-lime"
        />
        <label className="mb-2 block text-xs font-bold tracking-wide text-muted">DESCRIPCIÓN (OPCIONAL)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Consulta el endpoint /health cada 15 minutos"
          className="w-full rounded-lg border border-hairline bg-background px-3.5 py-2.5 text-sm outline-none focus:border-lime"
        />
      </section>

      <section className="mb-5 rounded-2xl bg-surface p-6">
        <h2 className="mb-[18px] font-display text-base font-bold">Disparador</h2>
        <div className="mb-4 grid grid-cols-2 gap-3">
          {(["manual", "scheduled"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTriggerType(option)}
              className={`rounded-xl border p-4 text-left ${
                triggerType === option ? "border-2 border-lime bg-violet-bg" : "border-hairline"
              }`}
            >
              <div className="text-sm font-bold">{option === "manual" ? "Manual" : "Programado"}</div>
              <div className="text-xs text-muted">{option === "manual" ? "Lo ejecutás vos" : "Corre solo, en cron"}</div>
            </button>
          ))}
        </div>
        {triggerType === "scheduled" && (
          <>
            <label className="mb-2 block text-xs font-bold tracking-wide text-muted">EXPRESIÓN CRON</label>
            <input
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
              placeholder="*/15 * * * *"
              className="w-full rounded-lg border border-hairline bg-background px-3.5 py-2.5 font-mono text-sm outline-none focus:border-lime"
            />
          </>
        )}
      </section>

      <section className="mb-6 rounded-2xl bg-surface p-6">
        <h2 className="mb-5 font-display text-base font-bold">Pasos</h2>
        <div className="flex flex-col gap-4">
          {steps.map((step, index) => (
            <div key={index} className="flex gap-4">
              <div className="flex w-7 flex-shrink-0 flex-col items-center">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet font-display text-[13px] font-bold text-white">
                  {index + 1}
                </div>
                {index < steps.length - 1 && <div className="my-1 w-0.5 flex-1 bg-hairline" />}
              </div>
              <div className="flex-1 rounded-xl border border-hairline p-4">
                {/* Pill stepType: Accion / Condicion */}
                <div className="mb-3.5 flex items-center justify-between">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => step.kind === "condition" && setStepKind(index, "http_request")}
                      className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                        step.kind !== "condition" ? "bg-lime text-lime-ink" : "border border-hairline text-muted"
                      }`}
                    >
                      Acción
                    </button>
                    <button
                      type="button"
                      onClick={() => setStepKind(index, "condition")}
                      className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                        step.kind === "condition" ? "bg-violet text-white" : "border border-hairline text-muted"
                      }`}
                    >
                      Condición
                    </button>
                  </div>
                  {steps.length > 1 && (
                    <button type="button" onClick={() => removeStep(index)} className="text-xs font-bold text-muted hover:text-pink">
                      Quitar
                    </button>
                  )}
                </div>

                {step.kind !== "condition" && (
                  <>
                    <label className="mb-2 block text-xs font-bold tracking-wide text-muted">TIPO DE ACCIÓN</label>
                    <div className="mb-3.5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setStepKind(index, "http_request")}
                        className={`rounded-lg px-3.5 py-2 text-xs font-semibold ${
                          step.kind === "http_request" ? "bg-violet-bg text-[#c9c1ff]" : "border border-hairline text-muted"
                        }`}
                      >
                        HTTP Request
                      </button>
                      <button
                        type="button"
                        onClick={() => setStepKind(index, "notification")}
                        className={`rounded-lg px-3.5 py-2 text-xs font-semibold ${
                          step.kind === "notification" ? "bg-violet-bg text-[#c9c1ff]" : "border border-hairline text-muted"
                        }`}
                      >
                        Notificación
                      </button>
                    </div>
                  </>
                )}

                {step.kind === "http_request" && (
                  <div className="grid grid-cols-[110px_1fr] gap-2.5">
                    <select
                      value={step.method}
                      onChange={(e) => updateStep(index, { method: e.target.value })}
                      className="rounded-lg border border-hairline bg-background px-2 py-2.5 text-center font-mono text-sm font-bold outline-none focus:border-lime"
                    >
                      {["GET", "POST", "PUT", "DELETE"].map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <input
                      value={step.url}
                      onChange={(e) => updateStep(index, { url: e.target.value })}
                      placeholder="https://api.flowforge.dev/health"
                      className="rounded-lg border border-hairline bg-background px-3.5 py-2.5 font-mono text-sm outline-none focus:border-lime"
                    />
                  </div>
                )}

                {step.kind === "condition" && (
                  <>
                    <label className="mb-2 block text-xs font-bold tracking-wide text-muted">SI SE CUMPLE</label>
                    <div className="grid grid-cols-[1fr_100px_1fr] gap-2.5">
                      <input
                        value={step.field}
                        onChange={(e) => updateStep(index, { field: e.target.value })}
                        placeholder="statusCode"
                        className="rounded-lg border border-hairline bg-background px-3.5 py-2.5 font-mono text-sm outline-none focus:border-lime"
                      />
                      <select
                        value={step.operator}
                        onChange={(e) => updateStep(index, { operator: e.target.value as ConditionOperator })}
                        className="rounded-lg border border-hairline bg-background px-2 py-2.5 text-center font-mono text-sm outline-none focus:border-lime"
                      >
                        {OPERATORS.map((op) => (
                          <option key={op} value={op}>
                            {op}
                          </option>
                        ))}
                      </select>
                      <input
                        value={step.value}
                        onChange={(e) => updateStep(index, { value: e.target.value })}
                        placeholder="200"
                        className="rounded-lg border border-hairline bg-background px-3.5 py-2.5 font-mono text-sm outline-none focus:border-lime"
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted">Compara contra el output del paso anterior. Si es falso, se corta la cadena.</p>
                  </>
                )}

                {step.kind === "notification" && (
                  <div className="flex flex-col gap-2.5">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="mb-2 block text-xs font-bold tracking-wide text-muted">DESTINATARIO</label>
                        <input
                          value={step.to}
                          onChange={(e) => updateStep(index, { to: e.target.value })}
                          placeholder="ops@flowforge.dev"
                          className="w-full rounded-lg border border-hairline bg-background px-3.5 py-2.5 text-sm outline-none focus:border-lime"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-bold tracking-wide text-muted">ASUNTO</label>
                        <input
                          value={step.subject}
                          onChange={(e) => updateStep(index, { subject: e.target.value })}
                          placeholder="Alerta: API no responde"
                          className="w-full rounded-lg border border-hairline bg-background px-3.5 py-2.5 text-sm outline-none focus:border-lime"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold tracking-wide text-muted">MENSAJE (OPCIONAL)</label>
                      <textarea
                        value={step.body}
                        onChange={(e) => updateStep(index, { body: e.target.value })}
                        rows={2}
                        placeholder="Podés usar {{campo}} para incluir datos del paso anterior."
                        className="w-full rounded-lg border border-hairline bg-background px-3.5 py-2.5 font-mono text-sm outline-none focus:border-lime"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="flex gap-4">
            <div className="w-7 flex-shrink-0" />
            <button
              type="button"
              onClick={addStep}
              className="flex-1 rounded-xl border-[1.5px] border-dashed border-lime py-3.5 text-sm font-bold text-lime"
            >
              + Agregar paso
            </button>
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => router.push("/")} className="px-4 py-2.5 text-sm font-semibold text-muted">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-lime px-5 py-2.5 text-sm font-bold text-lime-ink disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar workflow"}
        </button>
      </div>
    </form>
  );
}
