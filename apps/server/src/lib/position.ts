import { and, asc, eq, isNull } from "drizzle-orm";
import type { Lane } from "@todoer/shared";
import { db } from "../db/client";
import { tasks } from "../db/schema";

interface PosRow {
  id: string;
  position: number;
}

function lanePositions(userId: string, lane: Lane, excludeId?: string): PosRow[] {
  // Chore positions live within (userId, lane). Steps live under a parent and
  // share the table — exclude them here so chore reordering math isn't polluted.
  const rows = db
    .select({ id: tasks.id, position: tasks.position })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.lane, lane),
        isNull(tasks.parentId),
      ),
    )
    .orderBy(asc(tasks.position))
    .all();
  return excludeId ? rows.filter((r) => r.id !== excludeId) : rows;
}

function stepPositions(parentId: string, excludeId?: string): PosRow[] {
  const rows = db
    .select({ id: tasks.id, position: tasks.position })
    .from(tasks)
    .where(eq(tasks.parentId, parentId))
    .orderBy(asc(tasks.position))
    .all();
  return excludeId ? rows.filter((r) => r.id !== excludeId) : rows;
}

function fractionalPosition(
  rows: PosRow[],
  anchor: { beforeId?: string; afterId?: string },
): number {
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

/** Position that appends a task to the end of a lane. */
export function endPosition(userId: string, lane: Lane): number {
  const last = lanePositions(userId, lane).at(-1);
  return last !== undefined ? last.position + 1 : 1;
}

/**
 * Fractional position for a chore move. `afterId` / `beforeId` name an anchor
 * sibling in the destination lane; with neither (or an unknown anchor) the chore
 * goes to the end. Dropping between A and B yields (A + B) / 2 — no sibling
 * renumbering.
 */
export function movePosition(
  userId: string,
  lane: Lane,
  taskId: string,
  anchor: { beforeId?: string; afterId?: string },
): number {
  return fractionalPosition(lanePositions(userId, lane, taskId), anchor);
}

/** Position that appends a step to the end of its chore's step list. */
export function endStepPosition(parentId: string): number {
  const last = stepPositions(parentId).at(-1);
  return last !== undefined ? last.position + 1 : 1;
}

/** Fractional position for a step move within its parent chore. */
export function moveStepPosition(
  parentId: string,
  stepId: string,
  anchor: { beforeId?: string; afterId?: string },
): number {
  return fractionalPosition(stepPositions(parentId, stepId), anchor);
}
