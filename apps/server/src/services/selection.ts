import type { ChoreWithSteps, FocusItem, Task } from "@todoer/shared";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Urgency of a repeating chore: 0 (fresh / not repeating) .. 1 (very overdue).
 * Never-completed repeating chores are maximally urgent — "haven't vacuumed in
 * a month".
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

/** Higher = better to start with. Easy + stale + resumable floats to the top. */
function priority(chore: ChoreWithSteps, now: number, maxEstimate: number): number {
  const ease = maxEstimate > 0 ? 1 - chore.estimateMinutes / maxEstimate : 1;
  // Chores already in Doing have partial step progress → resume them first.
  // This is what makes "abandon mid-run, come back later" land you back on
  // the same chore.
  const resumeBoost = chore.lane === "doing" ? 1 : 0;
  return 0.5 * ease + 0.3 * staleness(chore, now) + 0.2 * resumeBoost;
}

/**
 * Picks a coherent batch of focusable chores for a Get Started run and expands
 * each into walkable `FocusItem`s. Anchors the session on one area so unrelated
 * chores never mix; only borrows a second area when the anchor is too thin.
 *
 * Input chores must come from Ready + Doing lanes only (the route filters them).
 * Within each chore, only incomplete steps emit FocusItems; standalone chores
 * (no steps) emit one item each.
 */
export function selectGetStartedSession(
  chores: ChoreWithSteps[],
  now: number,
): FocusItem[] {
  const focusable = chores.filter(hasFocusableWork);
  if (focusable.length === 0) return [];

  const maxEstimate = Math.max(...focusable.map((c) => c.estimateMinutes));
  const scored = focusable.map((chore) => ({
    chore,
    score: priority(chore, now, maxEstimate),
  }));

  const seed = scored.reduce((best, cur) => (cur.score > best.score ? cur : best));
  const seedArea = seed.chore.area;
  const inSeedGroup = (c: ChoreWithSteps): boolean =>
    seedArea === null ? c.id === seed.chore.id : c.area === seedArea;
  const byPosition = (a: ChoreWithSteps, b: ChoreWithSteps): number =>
    a.position - b.position;

  const seedChores = focusable.filter(inSeedGroup).sort(byPosition);
  const session = seedChores.flatMap(expandChoreToFocusItems);
  if (session.length >= 3) return session;

  // Anchor area thin — borrow the next highest-priority area (one extra max).
  const others = scored
    .filter(({ chore }) => !inSeedGroup(chore))
    .sort((a, b) => b.score - a.score);
  const lead = others[0];
  if (!lead) return session;

  if (lead.chore.area === null) {
    return [...session, ...expandChoreToFocusItems(lead.chore)];
  }
  const extra = focusable
    .filter((c) => c.area === lead.chore.area)
    .sort(byPosition)
    .flatMap(expandChoreToFocusItems);
  return [...session, ...extra];
}

/** True when the chore has actual work to do — at least one incomplete step,
 * or zero steps (standalone chore). A "Doing" chore whose steps are somehow all
 * complete is skipped (next reconcile will fix its lane). */
function hasFocusableWork(chore: ChoreWithSteps): boolean {
  if (chore.steps.length === 0) return true;
  return chore.steps.some((s) => s.completedAt === null);
}

function expandChoreToFocusItems(chore: ChoreWithSteps): FocusItem[] {
  const choreRow = stripSteps(chore);
  if (chore.steps.length === 0) {
    return [{ kind: "standalone", chore: choreRow }];
  }
  const stepTotal = chore.steps.length;
  const items: FocusItem[] = [];
  chore.steps.forEach((step, i) => {
    if (step.completedAt !== null) return;
    items.push({
      kind: "step",
      chore: choreRow,
      step,
      stepIndex: i + 1,
      stepTotal,
    });
  });
  return items;
}

function stripSteps(chore: ChoreWithSteps): Task {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { steps: _steps, ...rest } = chore;
  return rest;
}
