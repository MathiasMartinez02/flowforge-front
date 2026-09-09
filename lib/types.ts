// Tipos que reflejan las entidades reales del backend (workflows/workflow_steps/workflow_runs/step_runs).

export interface WorkflowStep {
  id: string;
  orderIndex: number;
  stepType: "action" | "condition";
  actionType: "http_request" | "notification" | null;
  config: Record<string, unknown>;
}

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  triggerType: "manual" | "scheduled";
  cronExpression: string | null;
  status: "draft" | "active" | "paused";
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
}

export interface StepRun {
  id: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  attempt: number;
  output: Record<string, unknown> | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  workflowStep: WorkflowStep;
}

export interface WorkflowRun {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  triggerSource: "manual" | "scheduled";
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  stepRuns: StepRun[];
}

// Body de creacion: Fase 1 solo soporta pasos de accion http_request (condition llega en la Fase 2).
export interface CreateWorkflowStepInput {
  orderIndex: number;
  stepType: "action";
  actionType: "http_request";
  config: { method: string; url: string };
}

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  triggerType: "manual" | "scheduled";
  cronExpression?: string;
  steps: CreateWorkflowStepInput[];
}
