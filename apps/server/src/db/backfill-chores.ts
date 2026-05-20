import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { Lane } from "@todoer/shared";
import { projects, tasks } from "./schema";

// Schema-agnostic alias: we use only the explicit `tasks` / `projects` table
// imports here, so the caller's TSchema parameter is irrelevant.
// biome-ignore lint/suspicious/noExplicitAny: intentional; see comment above.
type AnyDb = BetterSQLite3Database<any>;

/**
 * One-time on-boot data migration that converts pre-existing flat-flatten projects
 * (multiple tasks sharing a `project_id`) into the chore/step model: a new chore
 * row is inserted using the project's title, and the existing tasks become its
 * steps (parent_id set, original positions preserved).
 *
 * Idempotent: it only acts on (user, project_id) groups where more than one row
 * still has parent_id IS NULL — after migration, the chore is the singleton in
 * that group and re-running the function is a no-op.
 *
 * Standalone tasks (no project, or the only task in their project) are untouched.
 */
export function backfillChores(db: AnyDb): void {
  // Find every (user_id, project_id) group still in the pre-migration shape.
  const groups = db
    .select({
      userId: tasks.userId,
      projectId: tasks.projectId,
      count: sql<number>`count(*)`.as("n"),
    })
    .from(tasks)
    .where(and(sql`${tasks.projectId} IS NOT NULL`, isNull(tasks.parentId)))
    .groupBy(tasks.userId, tasks.projectId)
    .having(sql`count(*) > 1`)
    .all();

  if (groups.length === 0) return;

  db.transaction((tx) => {
    for (const group of groups) {
      const projectId = group.projectId!;
      const project = tx
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .get();
      if (!project) continue; // dangling project_id (project was deleted) — skip

      const children = tx
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, group.userId),
            eq(tasks.projectId, projectId),
            isNull(tasks.parentId),
          ),
        )
        .orderBy(asc(tasks.position))
        .all();
      if (children.length < 2) continue;

      const choreLane = deriveChoreLane(children.map((c) => c.lane));
      const chorePosition = endPositionTx(tx, group.userId, choreLane);
      const choreEstimate = Math.ceil(
        children.reduce((acc, c) => acc + c.estimateMinutes, 0) + 5,
      );
      const choreArea = dominantArea(children.map((c) => c.area));
      const choreCreatedAt = Math.min(...children.map((c) => c.createdAt));
      const choreCompletedAt =
        choreLane === "done"
          ? Math.max(...children.map((c) => c.completedAt ?? c.createdAt))
          : null;

      const choreId = randomUUID();
      tx.insert(tasks)
        .values({
          id: choreId,
          userId: group.userId,
          projectId,
          parentId: null,
          title: project.title,
          notes: "",
          area: choreArea,
          estimateMinutes: choreEstimate,
          lane: choreLane,
          position: chorePosition,
          isRepeating: false,
          lastCompletedAt: null,
          completedAt: choreCompletedAt,
          createdAt: choreCreatedAt,
        })
        .run();

      // Re-parent only the children we read above — the freshly-inserted chore
      // shares (userId, projectId, parentId IS NULL) so we must address by id.
      tx.update(tasks)
        .set({ parentId: choreId })
        .where(
          inArray(
            tasks.id,
            children.map((c) => c.id),
          ),
        )
        .run();
    }
  });
}

function deriveChoreLane(childLanes: Lane[]): Lane {
  const allDone = childLanes.every((l) => l === "done");
  if (allDone) return "done";
  const anyDone = childLanes.some((l) => l === "done");
  return anyDone ? "doing" : "ready";
}

function dominantArea(areas: (string | null)[]): string | null {
  const counts = new Map<string, number>();
  for (const area of areas) {
    if (area === null) continue;
    counts.set(area, (counts.get(area) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  let best: { area: string; count: number } | null = null;
  for (const [area, count] of counts) {
    if (best === null || count > best.count) best = { area, count };
  }
  return best?.area ?? null;
}

function endPositionTx(tx: AnyDb, userId: string, lane: Lane): number {
  const last = tx
    .select({ position: tasks.position })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.lane, lane),
        isNull(tasks.parentId),
      ),
    )
    .orderBy(sql`${tasks.position} desc`)
    .limit(1)
    .get();
  return last !== undefined ? last.position + 1 : 1;
}
