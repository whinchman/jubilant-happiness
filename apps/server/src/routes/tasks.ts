import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { and, eq, isNull } from "drizzle-orm";
import {
  createTaskSchema,
  moveTaskSchema,
  updateTaskSchema,
} from "@todoer/shared";
import { db } from "../db/client";
import { tasks, megaChores } from "../db/schema";
import { attachMegaChoreState } from "../services/board-blocked";
import { endPosition, movePosition } from "../lib/position";

function findTask(userId: string, id: string) {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .get();
}

function findChore(userId: string, id: string) {
  const row = findTask(userId, id);
  // Step rows are addressed via `/tasks/:choreId/steps/:stepId`; the chore-level
  // routes refuse them so a step never accidentally gets dragged across lanes.
  if (!row || row.parentId !== null) return null;
  return row;
}

export const taskRoutes: FastifyPluginAsync = async (app) => {
  app.post("/tasks", async (req, reply) => {
    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
    }
    const input = parsed.data;
    const lane = input.lane ?? "ready";
    const now = Date.now();
    const row = db
      .insert(tasks)
      .values({
        id: randomUUID(),
        userId: req.userId,
        projectId: input.projectId ?? null,
        title: input.title,
        notes: input.notes ?? "",
        area: input.area ?? null,
        estimateMinutes: input.estimateMinutes,
        lane,
        position: endPosition(req.userId, lane),
        isRepeating: input.isRepeating ?? false,
        lastCompletedAt: null,
        completedAt: lane === "done" ? now : null,
        createdAt: now,
      })
      .returning()
      .get();
    return reply.code(201).send(row);
  });

  app.patch<{ Params: { id: string } }>("/tasks/:id", async (req, reply) => {
    const existing = findChore(req.userId, req.params.id);
    if (!existing) return reply.code(404).send({ error: "not_found" });

    const parsed = updateTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
    }
    if (Object.keys(parsed.data).length === 0) return existing;

    return db
      .update(tasks)
      .set(parsed.data)
      .where(eq(tasks.id, req.params.id))
      .returning()
      .get();
  });

  app.delete<{ Params: { id: string } }>("/tasks/:id", async (req, reply) => {
    const existing = findChore(req.userId, req.params.id);
    if (!existing) return reply.code(404).send({ error: "not_found" });
    // The DB FK is NO ACTION (SQLite ADD COLUMN can't carry CASCADE), so steps
    // must be cleared explicitly before the chore — otherwise the FK rejects.
    db.delete(tasks).where(eq(tasks.parentId, req.params.id)).run();
    db.delete(tasks).where(eq(tasks.id, req.params.id)).run();
    return reply.code(204).send();
  });

  app.post<{ Params: { id: string } }>("/tasks/:id/move", async (req, reply) => {
    const existing = findChore(req.userId, req.params.id);
    if (!existing) return reply.code(404).send({ error: "not_found" });

    const parsed = moveTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
    }
    const { lane, beforeId, afterId } = parsed.data;

    // Blocked mega-chore chores cannot enter "doing." Detect cheaply by
    // computing membership for this chore's mega-chore (if any) and asking the
    // shared derivation function. This keeps the rule in one place.
    if (lane === "doing" && existing.megaChoreId !== null && existing.megaChoreGroup !== null) {
      const siblings = db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, req.userId),
            eq(tasks.megaChoreId, existing.megaChoreId),
            isNull(tasks.parentId),
          ),
        )
        .all();
      const titleRow = db
        .select()
        .from(megaChores)
        .where(eq(megaChores.id, existing.megaChoreId))
        .get();
      const totalGroups = siblings.reduce(
        (acc, s) => (s.megaChoreGroup && s.megaChoreGroup > acc ? s.megaChoreGroup : acc),
        0,
      );
      const memberships = siblings
        .filter((s) => s.megaChoreGroup !== null)
        .map((s) => ({
          choreId: s.id,
          megaChoreId: s.megaChoreId as string,
          group: s.megaChoreGroup as number,
          completedAt: s.completedAt,
        }));
      const decorated = attachMegaChoreState(
        siblings.map((s) => ({ ...s, steps: [] })),
        new Map([[existing.megaChoreId, titleRow?.title ?? ""]]),
        new Map([[existing.megaChoreId, totalGroups]]),
        memberships,
      );
      const me = decorated.find((d) => d.id === existing.id);
      if (me?.isBlocked) {
        return reply.code(409).send({ error: "blocked_by_mega_chore" });
      }
    }

    const position = movePosition(req.userId, lane, req.params.id, { beforeId, afterId });

    const enteringDone = lane === "done" && existing.lane !== "done";
    const leavingDone = lane !== "done" && existing.lane === "done";
    const enteringReady = lane === "ready" && existing.lane !== "ready";
    const now = Date.now();

    const row = db
      .update(tasks)
      .set({
        lane,
        position,
        completedAt: enteringDone ? now : leavingDone ? null : existing.completedAt,
        lastCompletedAt:
          enteringDone && existing.isRepeating ? now : existing.lastCompletedAt,
      })
      .where(eq(tasks.id, req.params.id))
      .returning()
      .get();

    // Dragging a chore into To Do is "start me over" — reset every step's
    // completion so the chore re-runs from the top. Same semantics as the
    // weekly Sunday reset, just triggered by the user.
    if (enteringReady) {
      db.update(tasks)
        .set({ completedAt: null })
        .where(eq(tasks.parentId, req.params.id))
        .run();
    }

    return row;
  });
};
