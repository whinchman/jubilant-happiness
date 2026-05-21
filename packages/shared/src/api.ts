import type {
  AuthStatus,
  Board,
  BreakdownPreview,
  FocusItem,
  Project,
  Task,
} from "./types";
import type {
  AcceptBreakdownInput,
  CreateStepInput,
  CreateTaskInput,
  Credentials,
  MoveStepInput,
  MoveTaskInput,
  PackingFormInput,
  SetupInput,
  UpdateStepInput,
  UpdateTaskInput,
} from "./schemas";

/** Thrown when an API request returns a non-2xx response. */
export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;

  constructor(status: number, detail: unknown) {
    super(`API error ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Only declare a JSON Content-Type when a body is actually being sent —
  // Fastify rejects DELETE/GET with that header and no body (`FST_ERR_CTP_EMPTY_JSON_BODY`).
  const hasBody = init?.body !== undefined && init.body !== null;
  const headers = hasBody
    ? { "Content-Type": "application/json", ...init?.headers }
    : init?.headers;
  const res = await fetch(`/api${path}`, { ...init, headers });
  if (!res.ok) {
    let detail: unknown;
    try {
      detail = await res.json();
    } catch {
      detail = undefined;
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function fetchBoard(): Promise<Board> {
  return request<Board>("/board");
}

export function fetchAreas(): Promise<string[]> {
  return request<string[]>("/areas");
}

export function fetchProjects(): Promise<Project[]> {
  return request<Project[]>("/projects");
}

export function createTask(input: CreateTaskInput): Promise<Task> {
  return request<Task>("/tasks", { method: "POST", body: JSON.stringify(input) });
}

export function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  return request<Task>(`/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteTask(id: string): Promise<void> {
  return request<void>(`/tasks/${id}`, { method: "DELETE" });
}

export function moveTask(id: string, input: MoveTaskInput): Promise<Task> {
  return request<Task>(`/tasks/${id}/move`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createStep(choreId: string, input: CreateStepInput): Promise<Task> {
  return request<Task>(`/tasks/${choreId}/steps`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateStep(
  choreId: string,
  stepId: string,
  input: UpdateStepInput,
): Promise<Task> {
  return request<Task>(`/tasks/${choreId}/steps/${stepId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteStep(choreId: string, stepId: string): Promise<void> {
  return request<void>(`/tasks/${choreId}/steps/${stepId}`, { method: "DELETE" });
}

export function moveStep(
  choreId: string,
  stepId: string,
  input: MoveStepInput,
): Promise<Task> {
  return request<Task>(`/tasks/${choreId}/steps/${stepId}/move`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteProject(id: string): Promise<void> {
  return request<void>(`/projects/${id}`, { method: "DELETE" });
}

export function requestBreakdown(text: string): Promise<BreakdownPreview> {
  return request<BreakdownPreview>("/breakdown", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function acceptBreakdown(input: AcceptBreakdownInput): Promise<Task> {
  return request<Task>("/breakdown/accept", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function generatePackingKit(
  input: PackingFormInput,
): Promise<BreakdownPreview> {
  return request<BreakdownPreview>("/kits/packing/generate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchGetStartedSession(): Promise<FocusItem[]> {
  return request<FocusItem[]>("/focus/get-started");
}

export function fetchAuthStatus(): Promise<AuthStatus> {
  return request<AuthStatus>("/auth/status");
}

export function setupAccount(input: SetupInput): Promise<void> {
  return request<void>("/auth/setup", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function login(input: Credentials): Promise<void> {
  return request<void>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function logout(): Promise<void> {
  return request<void>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });
}
