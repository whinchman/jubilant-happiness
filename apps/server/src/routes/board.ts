import type { FastifyPluginAsync } from "fastify";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type { Board, ChoreWithSteps } from "@todoer/shared";
import { db } from "../db/client";
import { tasks } from "../db/schema";

export const boardRoutes: FastifyPluginAsync = async (app) => {
  app.get("/board", async (req) => {
    const chores = db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, req.userId), isNull(tasks.parentId)))
      .orderBy(asc(tasks.position))
      .all();

    const stepsByParent = new Map<string, ChoreWithSteps["steps"]>();
    if (chores.length > 0) {
      const steps = db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, req.userId),
            inArray(
              tasks.parentId,
              chores.map((c) => c.id),
            ),
          ),
        )
        .orderBy(asc(tasks.position))
        .all();
      for (const step of steps) {
        if (step.parentId === null) continue;
        const bucket = stepsByParent.get(step.parentId);
        if (bucket) bucket.push(step);
        else stepsByParent.set(step.parentId, [step]);
      }
    }

    const board: Board = { ready: [], doing: [], done: [] };
    for (const chore of chores) {
      board[chore.lane].push({ ...chore, steps: stepsByParent.get(chore.id) ?? [] });
    }
    return board;
  });
};
