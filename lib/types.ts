// Tipos que reflejan las entidades reales del backend (workflows/workflow_steps/workflow_runs/step_runs).

export interface WorkflowStep {
  id: string;
  orderIndex: number;
  stepType: "action" | "condition";
  actionType: "http_request" | "notification" | "ai_task" | "github" | null;
  config: Record<string, unknown>;
}

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  triggerType: "manual" | "scheduled" | "webhook";
  cronExpression: string | null;
  // Solo poblado cuando triggerType es "webhook" (ver workflows.service.ts).
  webhookSecret: string | null;
  status: "draft" | "active" | "paused";
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
}

// Un intento fallido registrado dentro de step_run.output.attempts (ver workflow-engine.service.ts).
export interface StepAttempt {
  attempt: number;
  status: "failed";
  message: string;
  durationMs: number;
}

export interface StepRun {
  id: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  attempt: number;
  output: (Record<string, unknown> & { attempts?: StepAttempt[] }) | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  workflowStep: WorkflowStep;
}

export interface WorkflowRun {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  triggerSource: "manual" | "scheduled" | "webhook";
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  stepRuns: StepRun[];
  // Solo viene poblado en GET /runs/:id (findRun trae la relacion); listRuns no lo incluye.
  workflow?: { id: string; name: string };
}

// Body de creacion de un paso al crear un workflow.
// Ampliado en la Fase 2: antes (Fase 1) solo existia http_request; ahora suma condition y notification.
// Ampliado en la Fase 4: se suman las actions "ai_task" y "github".
export type CreateWorkflowStepInput =
  | { orderIndex: number; stepType: "action"; actionType: "http_request"; config: { method: string; url: string } }
  | {
      orderIndex: number;
      stepType: "action";
      actionType: "notification";
      config: { to: string; subject: string; body: string };
    }
  | {
      orderIndex: number;
      stepType: "action";
      actionType: "ai_task";
      config: { prompt: string };
    }
  | {
      orderIndex: number;
      stepType: "action";
      actionType: "github";
      config: { repo: string; githubAction: "create_issue" | "add_comment"; title?: string; body?: string; issueNumber?: string };
    }
  | {
      orderIndex: number;
      stepType: "condition";
      actionType?: undefined;
      config: { field: string; operator: "==" | "!=" | ">" | "<" | "contains"; value: string };
    };

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  triggerType: "manual" | "scheduled" | "webhook";
  cronExpression?: string;
  steps: CreateWorkflowStepInput[];
}

export interface GithubIntegrationStatus {
  connected: boolean;
  login: string | null;
}
