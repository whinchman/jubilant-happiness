import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { and, eq } from "drizzle-orm";
import {
  createTaskSchema,
  moveTaskSchema,
  updateTaskSchema,
} from "@todoer/shared";
import { db } from "../db/client";
import { tasks } from "../db/schema";
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
    const position = movePosition(req.userId, lane, req.params.id, { beforeId, afterId });

    const enteringDone = lane === "done" && existing.lane !== "done";
    const leavingDone = lane !== "done" && existing.lane === "done";
    const now = Date.now();

    return db
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
  });
};
