import type { ChoreWithSteps, MegaChoreRef } from "@todoer/shared";

interface MegaMembership {
  choreId: string;
  megaChoreId: string;
  group: number;
  completedAt: number | null;
}

/**
 * Attaches `megaChore` and `isBlocked` to each chore in place (returns a new
 * array of new objects). A chore is blocked when every group *before* it isn't
 * fully done yet — equivalently, when its group > (highest fully-done group) + 1.
 * Group 1 starts unblocked; group K unblocks once every chore in groups 1..K-1
 * is `done` (lane 'done' / completedAt non-null).
 *
 * Pure function so it is trivially unit-testable: the route caller is
 * responsible for assembling `megaTitles`, `totalGroupsByMega`, and the flat
 * `memberships` list from the DB.
 */
export function attachMegaChoreState(
  chores: ChoreWithSteps[],
  megaTitles: Map<string, string>,
  totalGroupsByMega: Map<string, number>,
  memberships: MegaMembership[] = [],
): ChoreWithSteps[] {
  // Per mega-chore, find the highest group such that every chore in groups
  // <= that group has completedAt set. Default 0 if even group 1 has work.
  const unblockedThrough = new Map<string, number>();
  const byMega = new Map<string, MegaMembership[]>();
  for (const m of memberships) {
    const bucket = byMega.get(m.megaChoreId);
    if (bucket) bucket.push(m);
    else byMega.set(m.megaChoreId, [m]);
  }
  for (const [megaId, list] of byMega) {
    const groups = Array.from(new Set(list.map((m) => m.group))).sort(
      (a, b) => a - b,
    );
    let through = 0;
    for (const g of groups) {
      const allDone = list
        .filter((m) => m.group === g)
        .every((m) => m.completedAt !== null);
      if (!allDone) break;
      through = g;
    }
    unblockedThrough.set(megaId, through);
  }

  // Build a per-chore lookup so we can attach without scanning memberships.
  const byChore = new Map<string, MegaMembership>();
  for (const m of memberships) byChore.set(m.choreId, m);

  return chores.map((c) => {
    const m = byChore.get(c.id);
    if (!m) return { ...c, isBlocked: false };
    const totalGroups = totalGroupsByMega.get(m.megaChoreId) ?? 0;
    const title = megaTitles.get(m.megaChoreId) ?? "";
    const ref: MegaChoreRef = {
      id: m.megaChoreId,
      title,
      group: m.group,
      totalGroups,
    };
    const through = unblockedThrough.get(m.megaChoreId) ?? 0;
    // Group `through` is fully done; group `through + 1` is the active group.
    // Chores in groups beyond the active group are blocked.
    return { ...c, megaChore: ref, isBlocked: m.group > through + 1 };
  });
}
