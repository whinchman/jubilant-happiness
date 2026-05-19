import { describe, expect, it } from "vitest";
import type { Task } from "@todoer/shared";
import { selectGetStartedSession, staleness } from "./selection";

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_000 * DAY;

function task(over: Partial<Task> & { id: string }): Task {
  return {
    id: over.id,
    userId: "u",
    projectId: over.projectId ?? null,
    title: over.title ?? over.id,
    notes: "",
    area: over.area ?? null,
    estimateMinutes: over.estimateMinutes ?? 10,
    lane: over.lane ?? "ready",
    position: over.position ?? 1,
    isRepeating: over.isRepeating ?? false,
    lastCompletedAt: over.lastCompletedAt ?? null,
    completedAt: null,
    createdAt: 0,
  };
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
  it("returns nothing when no tasks are ready", () => {
    expect(selectGetStartedSession([], NOW)).toEqual([]);
  });

  it("anchors on one area and orders it easiest-first", () => {
    const tasks = [
      task({ id: "k-big", area: "Kitchen", estimateMinutes: 10, position: 1 }),
      task({ id: "k-small", area: "Kitchen", estimateMinutes: 3, position: 2 }),
      task({ id: "y-1", area: "Yard", estimateMinutes: 5, position: 3 }),
      task({ id: "y-2", area: "Yard", estimateMinutes: 6, position: 4 }),
      task({ id: "y-3", area: "Yard", estimateMinutes: 7, position: 5 }),
    ];
    // Seed is the easiest task (k-small) -> Kitchen anchors, but it only has
    // 2 tasks (<3), so the next area (Yard) is borrowed.
    expect(selectGetStartedSession(tasks, NOW).map((t) => t.id)).toEqual([
      "k-small",
      "k-big",
      "y-1",
      "y-2",
      "y-3",
    ]);
  });

  it("keeps a single coherent area when it has enough tasks", () => {
    const tasks = [
      task({ id: "k1", area: "Kitchen", estimateMinutes: 4, position: 1 }),
      task({ id: "k2", area: "Kitchen", estimateMinutes: 6, position: 2 }),
      task({ id: "k3", area: "Kitchen", estimateMinutes: 8, position: 3 }),
      task({ id: "yard", area: "Yard", estimateMinutes: 5, position: 4 }),
    ];
    const session = selectGetStartedSession(tasks, NOW);
    expect(session.map((t) => t.id)).toEqual(["k1", "k2", "k3"]);
    expect(session.some((t) => t.area === "Yard")).toBe(false);
  });

  it("floats an overdue repeating task to the front of its area", () => {
    const tasks = [
      task({ id: "quick", area: "Home", estimateMinutes: 5, position: 1 }),
      task({
        id: "vacuum",
        area: "Home",
        estimateMinutes: 5,
        position: 2,
        isRepeating: true,
        lastCompletedAt: NOW - 30 * DAY,
      }),
      task({ id: "filler", area: "Home", estimateMinutes: 5, position: 3 }),
    ];
    // The overdue repeating task is the highest-priority seed; Home anchors.
    const session = selectGetStartedSession(tasks, NOW);
    expect(session).toHaveLength(3);
    expect(session.every((t) => t.area === "Home")).toBe(true);
  });
});
