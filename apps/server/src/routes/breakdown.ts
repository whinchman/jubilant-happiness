import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { acceptBreakdownSchema, breakdownRequestSchema } from "@todoer/shared";
import { db } from "../db/client";
import { projects, tasks } from "../db/schema";
import { endPosition } from "../lib/position";
import { breakdownTask, type BreakdownOutcome } from "../services/breakdown";

export const breakdownRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/breakdown",
    { config: { rateLimit: { max: 30, timeWindow: "1 hour" } } },
    async (req, reply) => {
      const parsed = breakdownRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: "invalid_input", issues: parsed.error.issues });
      }

      let outcome: BreakdownOutcome;
      try {
        outcome = await breakdownTask(parsed.data.text);
      } catch (err) {
        req.log.error({ err }, "breakdown request failed");
        return reply.code(503).send({ error: "breakdown_unavailable" });
      }

      if (!outcome.actionable) {
        return reply
          .code(422)
          .send({ error: "needs_clarification", clarification: outcome.clarification });
      }
      return {
        projectTitle: outcome.projectTitle,
        area: outcome.area,
        steps: outcome.steps,
      };
    },
  );

  app.post("/breakdown/accept", async (req, reply) => {
    const parsed = acceptBreakdownSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "invalid_input", issues: parsed.error.issues });
    }
    const { projectTitle, area, steps, isRepeating } = parsed.data;
    const now = Date.now();
    const projectId = randomUUID();
    const choreId = randomUUID();
    const stepEstimateSum = steps.reduce((acc, s) => acc + s.estimateMinutes, 0);
    const choreEstimate = Math.ceil(stepEstimateSum + 5);

    const chore = db.transaction((tx) => {
      tx.insert(projects)
        .values({ id: projectId, userId: req.userId, title: projectTitle, createdAt: now })
        .run();

      const choreRow = tx
        .insert(tasks)
        .values({
          id: choreId,
          userId: req.userId,
          projectId,
          parentId: null,
          title: projectTitle,
          notes: "",
          area,
          estimateMinutes: choreEstimate,
          lane: "ready",
          position: endPosition(req.userId, "ready"),
          isRepeating: isRepeating ?? false,
          lastCompletedAt: null,
          completedAt: null,
          createdAt: now,
        })
        .returning()
        .get();

      let stepPosition = 1;
      for (const step of steps) {
        tx.insert(tasks)
          .values({
            id: randomUUID(),
            userId: req.userId,
            projectId: null,
            parentId: choreId,
            title: step.title,
            notes: step.notes ?? "",
            area: null,
            estimateMinutes: step.estimateMinutes,
            lane: "ready",
            position: stepPosition,
            isRepeating: false,
            lastCompletedAt: null,
            completedAt: null,
            createdAt: now,
          })
          .run();
        stepPosition += 1;
      }

      return choreRow;
    });

    return reply.code(201).send(chore);
  });
};
