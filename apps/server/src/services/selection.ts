import type { Task } from "@todoer/shared";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Urgency of a repeating task: 0 (fresh / not repeating) .. 1 (very overdue).
 * Never-completed repeating tasks are maximally urgent — "haven't vacuumed in a month".
 */
export function staleness(task: Task, now: number): number {
  if (!task.isRepeating) return 0;
  if (task.lastCompletedAt === null) return 1;
  const days = (now - task.lastCompletedAt) / DAY_MS;
  if (days <= 0) return 0;
  if (days >= 14) return 1;
  if (days <= 7) return (days / 7) * 0.5;
  return 0.5 + ((days - 7) / 7) * 0.5;
}

/** Higher = better to start with. Easy + stale floats to the top. */
function priority(task: Task, now: number, maxEstimate: number): number {
  const ease = maxEstimate > 0 ? 1 - task.estimateMinutes / maxEstimate : 1;
  return 0.6 * ease + 0.4 * staleness(task, now);
}

/**
 * Picks a coherent, easiest-first batch of ready tasks for a Get Started run.
 * Anchors the session on one area so unrelated chores never mix; only borrows a
 * second area when the anchor is too thin to be worth a session.
 */
export function selectGetStartedSession(readyTasks: Task[], now: number): Task[] {
  if (readyTasks.length === 0) return [];

  const maxEstimate = Math.max(...readyTasks.map((t) => t.estimateMinutes));
  const scored = readyTasks.map((task) => ({
    task,
    score: priority(task, now, maxEstimate),
  }));

  const seed = scored.reduce((best, cur) => (cur.score > best.score ? cur : best));
  const seedArea = seed.task.area;

  const inSeedGroup = (t: Task): boolean =>
    seedArea === null ? t.id === seed.task.id : t.area === seedArea;

  const easiestFirst = (a: Task, b: Task): number =>
    a.estimateMinutes - b.estimateMinutes || a.position - b.position;

  const session = readyTasks.filter(inSeedGroup).sort(easiestFirst);
  if (session.length >= 3) return session;

  // Anchor area is thin — borrow the next highest-priority area (one extra max).
  const others = scored
    .filter(({ task }) => !inSeedGroup(task))
    .sort((a, b) => b.score - a.score);
  const lead = others[0];
  if (!lead) return session;

  if (lead.task.area === null) {
    return [...session, lead.task];
  }
  const extra = readyTasks
    .filter((t) => t.area === lead.task.area)
    .sort(easiestFirst);
  return [...session, ...extra];
}
