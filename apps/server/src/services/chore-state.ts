import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { Lane } from "@todoer/shared";
import { tasks } from "../db/schema";

// Schema-agnostic alias: the function uses explicit `tasks` table imports only.
// biome-ignore lint/suspicious/noExplicitAny: see above.
type AnyDb = BetterSQLite3Database<any>;

/**
 * Reconciles a chore's lane based on its steps' completion state, applying the
 * auto-promotion rules:
 *
 * - No steps → no-op (a standalone chore is driven only by user drag).
 * - First step transitions Ready → Doing.
 * - Last step transitions Doing → Done (and sets `completedAt`; if repeating,
 *   also sets `lastCompletedAt`).
 * - Unchecking a step from a fully-Done chore transitions it back to Doing and
 *   clears `completedAt`.
 *
 * Called by the step-toggle route after the toggle has persisted. Safe to call
 * with a step id (or any non-chore id) — it short-circuits if the row isn't a
 * top-level chore.
 */
export function reconcileChoreLane(db: AnyDb, choreId: string, now: number): void {
  const chore = db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, choreId), isNull(tasks.parentId)))
    .get();
  if (!chore) return;

  const steps = db
    .select()
    .from(tasks)
    .where(eq(tasks.parentId, choreId))
    .orderBy(asc(tasks.position))
    .all();
  if (steps.length === 0) return;

  const allDone = steps.every((s) => s.completedAt !== null);
  const noneDone = steps.every((s) => s.completedAt === null);

  if (allDone && chore.lane !== "done") {
    moveChoreToLane(db, chore.id, chore.userId, "done", {
      completedAt: now,
      lastCompletedAt: chore.isRepeating ? now : chore.lastCompletedAt,
    });
    return;
  }

  if (!allDone && chore.lane === "done") {
    moveChoreToLane(db, chore.id, chore.userId, "doing", {
      completedAt: null,
    });
    return;
  }

  if (!noneDone && !allDone && chore.lane === "ready") {
    moveChoreToLane(db, chore.id, chore.userId, "doing", {});
    return;
  }
}

function moveChoreToLane(
  db: AnyDb,
  choreId: string,
  userId: string,
  lane: Lane,
  extras: { completedAt?: number | null; lastCompletedAt?: number | null },
): void {
  const last = db
    .select({ position: tasks.position })
    .from(tasks)
    .where(
      and(eq(tasks.userId, userId), eq(tasks.lane, lane), isNull(tasks.parentId)),
    )
    .orderBy(sql`${tasks.position} desc`)
    .limit(1)
    .get();
  const position = last !== undefined ? last.position + 1 : 1;

  db.update(tasks)
    .set({ lane, position, ...extras })
    .where(eq(tasks.id, choreId))
    .run();
}
