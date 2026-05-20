import { describe, expect, it } from "vitest";
import type { Board, ChoreWithSteps, Lane } from "@todoer/shared";
import { computeMove, findLane, isLane } from "./board-dnd";

function chore(id: string, lane: Lane): ChoreWithSteps {
  return {
    id,
    userId: "u",
    projectId: null,
    parentId: null,
    title: id,
    notes: "",
    area: null,
    estimateMinutes: 10,
    lane,
    position: 1,
    isRepeating: false,
    lastCompletedAt: null,
    completedAt: null,
    createdAt: 0,
    steps: [],
  };
}

function board(partial: Partial<Board>): Board {
  return { ready: [], doing: [], done: [], ...partial };
}

describe("isLane", () => {
  it("recognizes lane ids and rejects others", () => {
    expect(isLane("ready")).toBe(true);
    expect(isLane("done")).toBe(true);
    expect(isLane("backlog")).toBe(false);
    expect(isLane("some-uuid")).toBe(false);
  });
});

describe("findLane", () => {
  it("locates the lane holding a task", () => {
    const b = board({ ready: [chore("a", "ready")] });
    expect(findLane(b, "a")).toBe("ready");
    expect(findLane(b, "missing")).toBeNull();
  });
});

describe("computeMove", () => {
  it("moves a task into an empty lane (dropped on the lane)", () => {
    const b = board({ ready: [chore("a", "ready")] });
    const result = computeMove(b, "a", "ready", "doing", "doing");
    expect(result?.board.ready).toHaveLength(0);
    expect(result?.board.doing.map((t) => t.id)).toEqual(["a"]);
    expect(result?.input).toEqual({ lane: "doing" });
  });

  it("anchors with afterId when dropped onto a card mid-lane", () => {
    const b = board({
      doing: [chore("x", "doing"), chore("y", "doing")],
      ready: [chore("a", "ready")],
    });
    const result = computeMove(b, "a", "ready", "doing", "y");
    expect(result?.board.doing.map((t) => t.id)).toEqual(["x", "a", "y"]);
    expect(result?.input).toEqual({ lane: "doing", afterId: "x" });
  });

  it("anchors with beforeId when dropped at the start of a lane", () => {
    const b = board({
      doing: [chore("x", "doing")],
      ready: [chore("a", "ready")],
    });
    const result = computeMove(b, "a", "ready", "doing", "x");
    expect(result?.board.doing.map((t) => t.id)).toEqual(["a", "x"]);
    expect(result?.input).toEqual({ lane: "doing", beforeId: "x" });
  });

  it("reorders within a single lane", () => {
    const b = board({
      ready: [chore("a", "ready"), chore("b", "ready"), chore("c", "ready")],
    });
    const result = computeMove(b, "a", "ready", "ready", "c");
    expect(result?.board.ready.map((t) => t.id)).toEqual(["b", "a", "c"]);
    expect(result?.input).toEqual({ lane: "ready", afterId: "b" });
  });

  it("stamps the moved task with its destination lane", () => {
    const b = board({ ready: [chore("a", "ready")] });
    const result = computeMove(b, "a", "ready", "done", "done");
    expect(result?.board.done[0]?.lane).toBe("done");
  });
});
