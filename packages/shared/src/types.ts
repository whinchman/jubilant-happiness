export const LANES = ["backlog", "ready", "doing", "done"] as const;
export type Lane = (typeof LANES)[number];

export interface Task {
  id: string;
  userId: string;
  projectId: string | null;
  title: string;
  notes: string;
  area: string | null;
  estimateMinutes: number;
  lane: Lane;
  position: number;
  isRepeating: boolean;
  lastCompletedAt: number | null;
  completedAt: number | null;
  createdAt: number;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
}

export interface Board {
  backlog: Task[];
  ready: Task[];
  doing: Task[];
  done: Task[];
}

/** A single <=10-minute step produced by the AI breakdown. */
export interface BreakdownStep {
  title: string;
  estimateMinutes: number;
}

/** The AI breakdown preview the user reviews before accepting. */
export interface BreakdownPreview {
  projectTitle: string;
  area: string;
  steps: BreakdownStep[];
}
