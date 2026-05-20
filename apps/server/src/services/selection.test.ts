import { describe, expect, it } from "vitest";
import type { ChoreWithSteps, Task } from "@todoer/shared";
import { selectGetStartedSession, staleness } from "./selection";

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_000 * DAY;

function task(over: Partial<Task> & { id: string }): Task {
  return {
    id: over.id,
    userId: "u",
    projectId: over.projectId ?? null,
    parentId: over.parentId ?? null,
    title: over.title ?? over.id,
    notes: "",
    area: over.area ?? null,
    estimateMinutes: over.estimateMinutes ?? 10,
    lane: over.lane ?? "ready",
    position: over.position ?? 1,
    isRepeating: over.isRepeating ?? false,
    lastCompletedAt: over.lastCompletedAt ?? null,
    completedAt: over.completedAt ?? null,
    createdAt: 0,
  };
}

function chore(
  over: Partial<Task> & { id: string },
  steps: Task[] = [],
): ChoreWithSteps {
  return { ...task(over), steps };
}

function step(
  parentId: string,
  over: Partial<Task> & { id: string },
): Task {
  return task({ ...over, parentId });
}

describe("staleness", () => {
  it("is 0 for a non-repeating task", () => {
    expect(staleness(task({ id: "a" }), NOW)).toBe(0);
  });

  it("is 1 for a repeating task that was never completed", () => {
    expect(staleness(task({ id: "a", isRepeating: true }), NOW)).toBe(1);
  });

  it("rises toward 1 as a repeating task ages", () => {
    const weekOld = staleness(
      task({ id: "a", isRepeating: true, lastCompletedAt: NOW - 7 * DAY }),
      NOW,
    );
    const monthOld = staleness(
      task({ id: "a", isRepeating: true, lastCompletedAt: NOW - 30 * DAY }),
      NOW,
    );
    expect(weekOld).toBeCloseTo(0.5);
    expect(monthOld).toBe(1);
  });
});

describe("selectGetStartedSession", () => {
  it("returns nothing when no chores are focusable", () => {
    expect(selectGetStartedSession([], NOW)).toEqual([]);
  });

  it("anchors on one area and walks chores in position order — standalones emit one item each", () => {
    const chores = [
      chore({ id: "k-big", area: "Kitchen", estimateMinutes: 10, position: 1 }),
      chore({ id: "k-small", area: "Kitchen", estimateMinutes: 3, position: 2 }),
      chore({ id: "y-1", area: "Yard", estimateMinutes: 5, position: 3 }),
      chore({ id: "y-2", area: "Yard", estimateMinutes: 6, position: 4 }),
      chore({ id: "y-3", area: "Yard", estimateMinutes: 7, position: 5 }),
    ];
    // Seed is the easiest chore (k-small) → Kitchen has 2 items (<3), so Yard
    // gets borrowed. Each chore is standalone → one FocusItem each.
    const session = selectGetStartedSession(chores, NOW);
    expect(session.map((i) => i.chore.id)).toEqual([
      "k-big",
      "k-small",
      "y-1",
      "y-2",
      "y-3",
    ]);
    expect(session.every((i) => i.kind === "standalone")).toBe(true);
  });

  it("explodes a chore-with-steps into one FocusItem per incomplete step in position order", () => {
    const kitchenChore = chore(
      {
        id: "kitchen",
        area: "Kitchen",
        estimateMinutes: 30,
        position: 1,
        lane: "doing",
      },
      [
        step("kitchen", { id: "s1", position: 1, completedAt: NOW - 100 }), // done
        step("kitchen", { id: "s2", position: 2, completedAt: null }),
        step("kitchen", { id: "s3", position: 3, completedAt: null }),
        step("kitchen", { id: "s4", position: 4, completedAt: null }),
      ],
    );
    const session = selectGetStartedSession([kitchenChore], NOW);
    expect(session).toHaveLength(3);
    expect(session.every((i) => i.kind === "step")).toBe(true);
    if (session[0]!.kind === "step") {
      expect(session[0]!.step.id).toBe("s2");
      expect(session[0]!.stepIndex).toBe(2);
      expect(session[0]!.stepTotal).toBe(4);
      expect(session[0]!.chore.id).toBe("kitchen");
    }
  });

  it("prioritizes a Doing-lane chore (resume) over a fresh Ready-lane sibling", () => {
    const partial = chore(
      {
        id: "partial-kitchen",
        area: "Kitchen",
        estimateMinutes: 30,
        position: 1,
        lane: "doing",
      },
      [
        step("partial-kitchen", { id: "p1", position: 1, completedAt: NOW - 100 }),
        step("partial-kitchen", { id: "p2", position: 2, completedAt: null }),
      ],
    );
    const fresh = chore(
      {
        id: "fresh-kitchen",
        area: "Kitchen",
        estimateMinutes: 5,
        position: 2,
        lane: "ready",
      },
    );
    const session = selectGetStartedSession([partial, fresh], NOW);
    // Partial chore must come first via the Doing-lane resume boost, even though
    // the fresh chore is "easier" by raw estimate.
    expect(session[0]!.chore.id).toBe("partial-kitchen");
  });

  it("skips a Doing chore whose steps are somehow all done (no work to focus on)", () => {
    const stale = chore(
      { id: "ghost", area: "Kitchen", position: 1, lane: "doing" },
      [step("ghost", { id: "g1", position: 1, completedAt: NOW - 100 })],
    );
    const fresh = chore({ id: "fresh", area: "Yard", position: 2, lane: "ready" });
    const session = selectGetStartedSession([stale, fresh], NOW);
    expect(session.map((i) => i.chore.id)).toEqual(["fresh"]);
  });

  it("keeps a single coherent area when it has enough FocusItems on its own", () => {
    // Kitchen is the easier seed (estimate 20 vs Yard's 30) → anchors Kitchen.
    // Its 3 step items satisfy the ≥3 threshold, so Yard is not borrowed.
    const kitchen = chore(
      { id: "k1", area: "Kitchen", estimateMinutes: 20, position: 1, lane: "ready" },
      [
        step("k1", { id: "k1-s1", position: 1, completedAt: null }),
        step("k1", { id: "k1-s2", position: 2, completedAt: null }),
        step("k1", { id: "k1-s3", position: 3, completedAt: null }),
      ],
    );
    const yardish = chore({ id: "y1", area: "Yard", estimateMinutes: 30, position: 2 });
    const session = selectGetStartedSession([kitchen, yardish], NOW);
    expect(session.map((i) => i.chore.id)).toEqual(["k1", "k1", "k1"]);
    expect(session.every((i) => i.chore.area === "Kitchen")).toBe(true);
  });
});
