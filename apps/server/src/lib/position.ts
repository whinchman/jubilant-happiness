import { and, asc, eq } from "drizzle-orm";
import type { Lane } from "@todoer/shared";
import { db } from "../db/client";
import { tasks } from "../db/schema";

interface PosRow {
  id: string;
  position: number;
}

function lanePositions(userId: string, lane: Lane, excludeId?: string): PosRow[] {
  const rows = db
    .select({ id: tasks.id, position: tasks.position })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.lane, lane)))
    .orderBy(asc(tasks.position))
    .all();
  return excludeId ? rows.filter((r) => r.id !== excludeId) : rows;
}

/** Position that appends a task to the end of a lane. */
export function endPosition(userId: string, lane: Lane): number {
  const last = lanePositions(userId, lane).at(-1);
  return last !== undefined ? last.position + 1 : 1;
}

/**
 * Fractional position for a move. `afterId` / `beforeId` name an anchor sibling
 * in the destination lane; with neither (or an unknown anchor) the task goes to
 * the end. Dropping between A and B yields (A + B) / 2 — no sibling renumbering.
 */
export function movePosition(
  userId: string,
  lane: Lane,
  taskId: string,
  anchor: { beforeId?: string; afterId?: string },
): number {
  const rows = lanePositions(userId, lane, taskId);

  if (anchor.afterId !== undefined) {
    const idx = rows.findIndex((r) => r.id === anchor.afterId);
    const prev = rows[idx]?.position;
    if (prev !== undefined) {
      const next = rows[idx + 1]?.position;
      return next === undefined ? prev + 1 : (prev + next) / 2;
    }
  }

  if (anchor.beforeId !== undefined) {
    const idx = rows.findIndex((r) => r.id === anchor.beforeId);
    const next = rows[idx]?.position;
    if (next !== undefined) {
      const prev = rows[idx - 1]?.position;
      return prev === undefined ? next - 1 : (prev + next) / 2;
    }
  }

  const last = rows.at(-1);
  return last !== undefined ? last.position + 1 : 1;
}
