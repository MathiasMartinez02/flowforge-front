"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createWorkflow } from "@/lib/api-client";
import type { CreateWorkflowStepInput } from "@/lib/types";

type DraftStep = { method: string; url: string };

// Formulario de creacion: nombre, trigger (manual/programado) y pasos http_request en orden. Fase 1: sin condition ni notification todavia.
export default function NewWorkflowPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<"manual" | "scheduled">("manual");
  const [cronExpression, setCronExpression] = useState("");
  const [steps, setSteps] = useState<DraftStep[]>([{ method: "GET", url: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateStep(index: number, patch: Partial<DraftStep>) {
    setSteps((prev) => prev.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  }

  function addStep() {
    setSteps((prev) => [...prev, { method: "GET", url: "" }]);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Falta el nombre del workflow");
    if (triggerType === "scheduled" && !cronExpression.trim()) return setError("Falta la expresión cron");
    if (steps.some((s) => !s.url.trim())) return setError("Todos los pasos necesitan una URL");

    const stepsInput: CreateWorkflowStepInput[] = steps.map((step, index) => ({
      orderIndex: index,
      stepType: "action",
      actionType: "http_request",
      config: { method: step.method, url: step.url.trim() },
    }));

    setSaving(true);
    try {
      await createWorkflow({
        name: name.trim(),
        description: description.trim() || undefined,
        triggerType,
        cronExpression: triggerType === "scheduled" ? cronExpression.trim() : undefined,
        steps: stepsInput,
      });
      router.push("/");
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
                <div className="mb-3.5 flex items-center justify-between">
                  <span className="rounded-lg bg-violet-bg px-3.5 py-2 text-xs font-semibold text-[#c9c1ff]">HTTP Request</span>
                  {steps.length > 1 && (
                    <button type="button" onClick={() => removeStep(index)} className="text-xs font-bold text-muted hover:text-pink">
                      Quitar
                    </button>
                  )}
                </div>
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
