export const LANES = ["ready", "doing", "done"] as const;
export type Lane = (typeof LANES)[number];

export interface Task {
  id: string;
  userId: string;
  projectId: string | null;
  /**
   * NULL for a chore (top-level, lives on the board). Set to the chore's id for
   * a step (lives in an ordered checklist under the chore; no lane semantics).
   */
  parentId: string | null;
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

/** Identifies and locates a chore inside a mega-chore. Set by board reads. */
export interface MegaChoreRef {
  id: string;
  title: string;
  /** 1-indexed parallel-group index this chore belongs to. */
  group: number;
  /** Total number of parallel groups in this mega-chore. */
  totalGroups: number;
}

/** One turn in the mega-chore-kit clarifying chat. */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** A chore as returned by the board API — its steps embedded in position order. */
export interface ChoreWithSteps extends Task {
  steps: Task[];
  /** Set when this chore is part of a mega-chore; omitted otherwise. */
  megaChore?: MegaChoreRef;
  /** True when this mega-chore chore is in a group later than the unblocked-through group. */
  isBlocked?: boolean;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
}

export interface Board {
  ready: ChoreWithSteps[];
  doing: ChoreWithSteps[];
  done: ChoreWithSteps[];
}

/**
 * The focus run iterates one of these at a time. A chore with steps explodes into
 * one `step` item per incomplete step; a chore with no steps emits one `standalone`
 * item representing the chore itself.
 */
export type FocusItem =
  | { kind: "standalone"; chore: Task }
  | {
      kind: "step";
      chore: Task;
      step: Task;
      stepIndex: number; // 1-based position of this step among the chore's steps
      stepTotal: number;
    };

/** A single <=10-minute step produced by the AI breakdown. */
export interface BreakdownStep {
  title: string;
  estimateMinutes: number;
  /** Optional free-text notes (e.g. packing-kit items: "passport, wallet, tickets"). */
  notes?: string;
}

/** The AI breakdown preview the user reviews before accepting. */
export interface BreakdownPreview {
  projectTitle: string;
  area: string;
  steps: BreakdownStep[];
}

/** Preview produced by the mega-chore kit and confirmed by the multi-chore review. */
export interface MegaChoreBreakdownPreview {
  megaChore: { title: string };
  /** Shared area applied to all chores in the mega-chore. */
  area: string;
  chores: Array<{
    title: string;
    estimateMinutes: number;
    group: number;
    steps: Array<{ title: string; estimateMinutes: number; notes?: string }>;
  }>;
}

/** Discriminated turn response from /kits/mega-chore/turn. */
export type MegaChoreTurn =
  | { kind: "question"; assistantMessage: string }
  | { kind: "breakdown"; preview: MegaChoreBreakdownPreview };

export interface AuthStatus {
  /** True before any account has been created (first run). */
  needsSetup: boolean;
  /** True when the current session is logged in. */
  authenticated: boolean;
  /** True when SETUP_TOKEN is set on the server — the Setup form must include a matching token. */
  requiresSetupToken: boolean;
}
