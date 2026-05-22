import { describe, expect, it } from "vitest";
import type { ChoreWithSteps } from "@todoer/shared";
import { attachMegaChoreState } from "./board-blocked";

interface MegaInput {
  megaChoreId: string | null;
  megaChoreGroup: number | null;
  completedAt: number | null;
}

function mkChore(
  id: string,
  m: MegaInput,
  megaTitlesById: Map<string, string>,
): ChoreWithSteps {
  return {
    id,
    userId: "u",
    projectId: null,
    parentId: null,
    title: id,
    notes: "",
    area: null,
    estimateMinutes: 10,
    lane: m.completedAt === null ? "ready" : "done",
    position: 1,
    isRepeating: false,
    lastCompletedAt: null,
    completedAt: m.completedAt,
    createdAt: 0,
    steps: [],
    // these two are not on the type — passed through attach via the row map
  } as ChoreWithSteps & { _m: MegaInput };
}

describe("attachMegaChoreState", () => {
  it("leaves ordinary (non-mega) chores untouched", () => {
    const out = attachMegaChoreState(
      [{ ...mkChore("c1", { megaChoreId: null, megaChoreGroup: null, completedAt: null }, new Map()) }],
      new Map(),
      new Map(),
    );
    expect(out[0].megaChore).toBeUndefined();
    expect(out[0].isBlocked).toBe(false);
  });

  it("marks group 2 blocked when group 1 has incomplete chores", () => {
    const titles = new Map([["m1", "Clean the garage"]]);
    const chores = [
      { ...mkChore("a", { megaChoreId: "m1", megaChoreGroup: 1, completedAt: null }, titles) },
      { ...mkChore("b", { megaChoreId: "m1", megaChoreGroup: 2, completedAt: null }, titles) },
    ];
    const groupsByMega = new Map<string, number>([["m1", 2]]);
    const out = attachMegaChoreState(chores, titles, groupsByMega, [
      { choreId: "a", megaChoreId: "m1", group: 1, completedAt: null },
      { choreId: "b", megaChoreId: "m1", group: 2, completedAt: null },
    ]);
    expect(out[0].megaChore).toEqual({
      id: "m1",
      title: "Clean the garage",
      group: 1,
      totalGroups: 2,
    });
    expect(out[0].isBlocked).toBe(false);
    expect(out[1].isBlocked).toBe(true);
  });

  it("unblocks group 2 once all group-1 chores are done", () => {
    const titles = new Map([["m1", "Clean the garage"]]);
    const chores = [
      { ...mkChore("a", { megaChoreId: "m1", megaChoreGroup: 1, completedAt: 1 }, titles) },
      { ...mkChore("b", { megaChoreId: "m1", megaChoreGroup: 2, completedAt: null }, titles) },
    ];
    const groupsByMega = new Map<string, number>([["m1", 2]]);
    const out = attachMegaChoreState(chores, titles, groupsByMega, [
      { choreId: "a", megaChoreId: "m1", group: 1, completedAt: 1 },
      { choreId: "b", megaChoreId: "m1", group: 2, completedAt: null },
    ]);
    expect(out[1].isBlocked).toBe(false);
  });

  it("keeps group 3 blocked when group 2 still has work", () => {
    const titles = new Map([["m1", "x"]]);
    const chores = [
      { ...mkChore("a", { megaChoreId: "m1", megaChoreGroup: 1, completedAt: 1 }, titles) },
      { ...mkChore("b", { megaChoreId: "m1", megaChoreGroup: 2, completedAt: null }, titles) },
      { ...mkChore("c", { megaChoreId: "m1", megaChoreGroup: 3, completedAt: null }, titles) },
    ];
    const out = attachMegaChoreState(chores, titles, new Map([["m1", 3]]), [
      { choreId: "a", megaChoreId: "m1", group: 1, completedAt: 1 },
      { choreId: "b", megaChoreId: "m1", group: 2, completedAt: null },
      { choreId: "c", megaChoreId: "m1", group: 3, completedAt: null },
    ]);
    expect(out[0].isBlocked).toBe(false);
    expect(out[1].isBlocked).toBe(false);
    expect(out[2].isBlocked).toBe(true);
  });

  it("unblocks all when every chore is done", () => {
    const titles = new Map([["m1", "x"]]);
    const chores = [
      { ...mkChore("a", { megaChoreId: "m1", megaChoreGroup: 1, completedAt: 1 }, titles) },
      { ...mkChore("b", { megaChoreId: "m1", megaChoreGroup: 2, completedAt: 1 }, titles) },
    ];
    const out = attachMegaChoreState(chores, titles, new Map([["m1", 2]]), [
      { choreId: "a", megaChoreId: "m1", group: 1, completedAt: 1 },
      { choreId: "b", megaChoreId: "m1", group: 2, completedAt: 1 },
    ]);
    expect(out[0].isBlocked).toBe(false);
    expect(out[1].isBlocked).toBe(false);
  });
});
