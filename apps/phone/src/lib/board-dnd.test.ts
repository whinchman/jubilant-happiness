import { describe, expect, it } from "vitest";
import type { Board, Lane, Task } from "@todoer/shared";
import { computeMove, findLane, isLane } from "./board-dnd";

function task(id: string, lane: Lane): Task {
  return {
    id,
    userId: "u",
    projectId: null,
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
  };
}

function board(partial: Partial<Board>): Board {
  return { backlog: [], ready: [], doing: [], done: [], ...partial };
}

describe("isLane", () => {
  it("recognizes lane ids and rejects others", () => {
    expect(isLane("backlog")).toBe(true);
    expect(isLane("done")).toBe(true);
    expect(isLane("some-uuid")).toBe(false);
  });
});

describe("findLane", () => {
  it("locates the lane holding a task", () => {
    const b = board({ ready: [task("a", "ready")] });
    expect(findLane(b, "a")).toBe("ready");
    expect(findLane(b, "missing")).toBeNull();
  });
});

describe("computeMove", () => {
  it("moves a task into an empty lane (dropped on the lane)", () => {
    const b = board({ backlog: [task("a", "backlog")] });
    const result = computeMove(b, "a", "backlog", "ready", "ready");
    expect(result?.board.backlog).toHaveLength(0);
    expect(result?.board.ready.map((t) => t.id)).toEqual(["a"]);
    expect(result?.input).toEqual({ lane: "ready" });
  });

  it("anchors with afterId when dropped onto a card mid-lane", () => {
    const b = board({
      ready: [task("x", "ready"), task("y", "ready")],
      backlog: [task("a", "backlog")],
    });
    const result = computeMove(b, "a", "backlog", "ready", "y");
    expect(result?.board.ready.map((t) => t.id)).toEqual(["x", "a", "y"]);
    expect(result?.input).toEqual({ lane: "ready", afterId: "x" });
  });

  it("anchors with beforeId when dropped at the start of a lane", () => {
    const b = board({
      ready: [task("x", "ready")],
      backlog: [task("a", "backlog")],
    });
    const result = computeMove(b, "a", "backlog", "ready", "x");
    expect(result?.board.ready.map((t) => t.id)).toEqual(["a", "x"]);
    expect(result?.input).toEqual({ lane: "ready", beforeId: "x" });
  });

  it("reorders within a single lane", () => {
    const b = board({
      ready: [task("a", "ready"), task("b", "ready"), task("c", "ready")],
    });
    const result = computeMove(b, "a", "ready", "ready", "c");
    expect(result?.board.ready.map((t) => t.id)).toEqual(["b", "a", "c"]);
    expect(result?.input).toEqual({ lane: "ready", afterId: "b" });
  });

  it("stamps the moved task with its destination lane", () => {
    const b = board({ backlog: [task("a", "backlog")] });
    const result = computeMove(b, "a", "backlog", "done", "done");
    expect(result?.board.done[0]?.lane).toBe("done");
  });
});
