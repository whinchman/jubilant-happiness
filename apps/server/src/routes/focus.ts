import type { FastifyPluginAsync } from "fastify";
import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import type { ChoreWithSteps } from "@todoer/shared";
import { db } from "../db/client";
import { tasks } from "../db/schema";
import { selectGetStartedSession } from "../services/selection";

export const focusRoutes: FastifyPluginAsync = async (app) => {
  // Returns an ordered, coherent batch of FocusItems for a Get Started run.
  // Sources chores from Ready + Doing — Doing-lane chores are mid-flight runs
  // that should resume on the user's next session.
  app.get("/focus/get-started", async (req) => {
    const chores = db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, req.userId),
          isNull(tasks.parentId),
          or(eq(tasks.lane, "ready"), eq(tasks.lane, "doing")),
        ),
      )
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

    const withSteps: ChoreWithSteps[] = chores.map((c) => ({
      ...c,
      steps: stepsByParent.get(c.id) ?? [],
    }));
    return selectGetStartedSession(withSteps, Date.now());
  });
};
