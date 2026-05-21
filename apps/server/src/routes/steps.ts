import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import {
  createStepSchema,
  moveStepSchema,
  updateStepSchema,
} from "@todoer/shared";
import { db } from "../db/client";
import { tasks } from "../db/schema";
import { endStepPosition, moveStepPosition } from "../lib/position";
import { reconcileChoreLane } from "../services/chore-state";

type Params = { choreId: string; stepId: string };
type ChoreParams = { choreId: string };

function findChore(userId: string, choreId: string) {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, choreId), eq(tasks.userId, userId)))
    .get();
}

function findStep(userId: string, choreId: string, stepId: string) {
  return db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.id, stepId),
        eq(tasks.userId, userId),
        eq(tasks.parentId, choreId),
      ),
    )
    .get();
}

export const stepRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Params: ChoreParams }>(
    "/tasks/:choreId/steps",
    async (req, reply) => {
      const chore = findChore(req.userId, req.params.choreId);
      if (!chore || chore.parentId !== null) {
        return reply.code(404).send({ error: "not_found" });
      }
      const parsed = createStepSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: "invalid_input", issues: parsed.error.issues });
      }
      const now = Date.now();
      const row = db
        .insert(tasks)
        .values({
          id: randomUUID(),
          userId: req.userId,
          projectId: null,
          parentId: chore.id,
          title: parsed.data.title,
          notes: "",
          area: null,
          estimateMinutes: parsed.data.estimateMinutes,
          // Step lane mirrors the chore for index sanity — not user-visible.
          lane: chore.lane,
          position: endStepPosition(chore.id),
          isRepeating: false,
          lastCompletedAt: null,
          completedAt: null,
          createdAt: now,
        })
        .returning()
        .get();
      // Adding a step to a fully-done chore reopens it (now there's an
      // incomplete step). reconcileChoreLane handles the Done → Doing flip.
      reconcileChoreLane(db, chore.id, now);
      return reply.code(201).send(row);
    },
  );

  app.patch<{ Params: Params }>(
    "/tasks/:choreId/steps/:stepId",
    async (req, reply) => {
      const step = findStep(req.userId, req.params.choreId, req.params.stepId);
      if (!step) return reply.code(404).send({ error: "not_found" });

      const parsed = updateStepSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: "invalid_input", issues: parsed.error.issues });
      }
      if (Object.keys(parsed.data).length === 0) return step;

      const now = Date.now();
      const next: Partial<typeof tasks.$inferInsert> = {};
      if (parsed.data.title !== undefined) next.title = parsed.data.title;
      if (parsed.data.estimateMinutes !== undefined) {
        next.estimateMinutes = parsed.data.estimateMinutes;
      }
      if (parsed.data.notes !== undefined) {
        next.notes = parsed.data.notes;
      }
      if (parsed.data.completed !== undefined) {
        next.completedAt = parsed.data.completed ? now : null;
      }

      const updated = db
        .update(tasks)
        .set(next)
        .where(eq(tasks.id, step.id))
        .returning()
        .get();

      if (parsed.data.completed !== undefined) {
        reconcileChoreLane(db, req.params.choreId, now);
      }
      return updated;
    },
  );

  app.delete<{ Params: Params }>(
    "/tasks/:choreId/steps/:stepId",
    async (req, reply) => {
      const step = findStep(req.userId, req.params.choreId, req.params.stepId);
      if (!step) return reply.code(404).send({ error: "not_found" });
      db.delete(tasks).where(eq(tasks.id, step.id)).run();
      // Deleting a step can flip the chore's lane (e.g. if it was the only
      // incomplete step left, the chore is now fully done).
      reconcileChoreLane(db, req.params.choreId, Date.now());
      return reply.code(204).send();
    },
  );

  app.post<{ Params: Params }>(
    "/tasks/:choreId/steps/:stepId/move",
    async (req, reply) => {
      const step = findStep(req.userId, req.params.choreId, req.params.stepId);
      if (!step) return reply.code(404).send({ error: "not_found" });

      const parsed = moveStepSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: "invalid_input", issues: parsed.error.issues });
      }
      const position = moveStepPosition(req.params.choreId, step.id, parsed.data);
      return db
        .update(tasks)
        .set({ position })
        .where(eq(tasks.id, step.id))
        .returning()
        .get();
    },
  );
};
