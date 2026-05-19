import type { FastifyInstance } from "fastify";
import { ACCOUNT_ID } from "../auth";
import { runWeeklyResetIfDue } from "../services/weekly-reset";
import { areaRoutes } from "./areas";
import { authRoutes } from "./auth";
import { boardRoutes } from "./board";
import { breakdownRoutes } from "./breakdown";
import { focusRoutes } from "./focus";
import { projectRoutes } from "./projects";
import { taskRoutes } from "./tasks";

/**
 * Mounts the API. Auth routes are public; everything else sits behind a guard
 * that requires an authenticated session and resolves the request's userId.
 */
export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(
    async (api) => {
      await api.register(authRoutes);

      await api.register(async (guarded) => {
        guarded.addHook("preHandler", async (req, reply) => {
          if (req.session.get("authed") !== true) {
            return reply.code(401).send({ error: "unauthorized" });
          }
          req.userId = ACCOUNT_ID;
          runWeeklyResetIfDue();
        });
        await guarded.register(boardRoutes);
        await guarded.register(taskRoutes);
        await guarded.register(projectRoutes);
        await guarded.register(areaRoutes);
        await guarded.register(breakdownRoutes);
        await guarded.register(focusRoutes);
      });
    },
    { prefix: "/api" },
  );
}
