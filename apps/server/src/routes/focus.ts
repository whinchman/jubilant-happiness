import type { FastifyPluginAsync } from "fastify";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client";
import { tasks } from "../db/schema";
import { selectGetStartedSession } from "../services/selection";

export const focusRoutes: FastifyPluginAsync = async (app) => {
  // Returns an ordered, coherent batch of ready tasks for a Get Started run.
  app.get("/focus/get-started", async (req) => {
    const ready = db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, req.userId), eq(tasks.lane, "ready")))
      .all();
    return selectGetStartedSession(ready, Date.now());
  });
};
