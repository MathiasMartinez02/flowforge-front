import type { CreateWorkflowInput, Workflow, WorkflowRun } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

// Wrapper mínimo sobre fetch hacia el backend: centraliza la base URL y el manejo de errores HTTP.
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }

  return res.json() as Promise<T>;
}

// Lista todos los workflows (con sus pasos, para mostrar stepsCount en el dashboard).
export function listWorkflows(): Promise<Workflow[]> {
  return apiFetch<Workflow[]>("/workflows");
}

// Detalle de un workflow puntual.
export function getWorkflow(id: string): Promise<Workflow> {
  return apiFetch<Workflow>(`/workflows/${id}`);
}

// Crea un workflow con sus pasos.
export function createWorkflow(input: CreateWorkflowInput): Promise<Workflow> {
  return apiFetch<Workflow>("/workflows", { method: "POST", body: JSON.stringify(input) });
}

// Dispara una ejecucion y devuelve el run recien creado.
// Cambio en la Fase 2: el backend ya no ejecuta de forma sincrona (encola por BullMQ), asi que el
// run vuelve en estado 'running' — hay que consultar getRun/pollear hasta que termine.
export function runWorkflow(id: string): Promise<WorkflowRun> {
  return apiFetch<WorkflowRun>(`/workflows/${id}/runs`, { method: "POST" });
}

// Activa o pausa un workflow. Agregado en la Fase 3: pausar un workflow programado da de baja su
// cron en el scheduler del backend (ver SchedulerService.sync), sin borrar la expresion cron.
export function updateWorkflowStatus(id: string, status: Workflow["status"]): Promise<Workflow> {
  return apiFetch<Workflow>(`/workflows/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
}

// Historial de runs de un workflow, mas recientes primero.
export function listRuns(workflowId: string): Promise<WorkflowRun[]> {
  return apiFetch<WorkflowRun[]>(`/workflows/${workflowId}/runs`);
}

// Detalle de un run puntual, con sus step_runs.
export function getRun(id: string): Promise<WorkflowRun> {
  return apiFetch<WorkflowRun>(`/runs/${id}`);
}
