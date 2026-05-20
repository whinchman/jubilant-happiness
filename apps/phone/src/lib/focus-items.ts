import type { ChoreWithSteps, FocusItem, Task } from "@todoer/shared";

/**
 * Client-side mirror of the server's per-chore expansion (see
 * apps/server/src/services/selection.ts → expandChoreToFocusItems).
 * Used to start a focus run on a single chore straight from the board
 * without round-tripping through /focus/get-started.
 */
export function expandChoreToFocusItems(chore: ChoreWithSteps): FocusItem[] {
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

export function hasFocusableWork(chore: ChoreWithSteps): boolean {
  if (chore.steps.length === 0) return true;
  return chore.steps.some((s) => s.completedAt === null);
}

function stripSteps(chore: ChoreWithSteps): Task {
  const { steps: _steps, ...rest } = chore;
  return rest;
}
