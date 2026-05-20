import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db/client";
import { appMeta, tasks, type TaskRow } from "../db/schema";
import { endPosition } from "../lib/position";

const LAST_RESET_KEY = "last_weekly_reset_at";

/** Local-time midnight of the most recent Sunday. */
function mostRecentSundayStart(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.getTime();
}

/**
 * Moves completed repeating tasks back to the Ready lane once per week (Sunday).
 * Runs for every user at once when due. Lazy and idempotent — safe to call on every request;
 * only does work when the most recent Sunday is past the stored marker.
 */
export function runWeeklyResetIfDue(now: number = Date.now()): void {
  const meta = db
    .select()
    .from(appMeta)
    .where(eq(appMeta.key, LAST_RESET_KEY))
    .get();
  const lastReset = meta ? Number(meta.value) : 0;

  if (lastReset >= mostRecentSundayStart(now)) return;

  // Only chores can be repeating (steps inherit their parent's reset). The
  // parent_id IS NULL clause is belt-and-suspenders against legacy step rows
  // that may still carry is_repeating=true from before the chore/step model.
  const repeatingDone = db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.isRepeating, true),
        eq(tasks.lane, "done"),
        isNull(tasks.parentId),
      ),
    )
    .all();

  // Group by user so each user's reset rows land at the end of *their own* Ready lane.
  const byUser = new Map<string, TaskRow[]>();
  for (const chore of repeatingDone) {
    const list = byUser.get(chore.userId);
    if (list) list.push(chore);
    else byUser.set(chore.userId, [chore]);
  }

  for (const [userId, userChores] of byUser) {
    let position = endPosition(userId, "ready");
    for (const chore of userChores) {
      db.update(tasks)
        .set({ lane: "ready", position, completedAt: null })
        .where(eq(tasks.id, chore.id))
        .run();
      // Reset all steps to pending so the chore starts fresh on the next run.
      db.update(tasks)
        .set({ completedAt: null })
        .where(eq(tasks.parentId, chore.id))
        .run();
      position += 1;
    }
  }

  db.insert(appMeta)
    .values({ key: LAST_RESET_KEY, value: String(now) })
    .onConflictDoUpdate({ target: appMeta.key, set: { value: String(now) } })
    .run();
}
