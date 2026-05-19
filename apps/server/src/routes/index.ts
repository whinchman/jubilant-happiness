import type { FastifyInstance } from "fastify";
import { areaRoutes } from "./areas";
import { boardRoutes } from "./board";
import { projectRoutes } from "./projects";
import { taskRoutes } from "./tasks";

/** Mounts every API route plugin under the /api prefix. */
export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(
    async (api) => {
      await api.register(boardRoutes);
      await api.register(taskRoutes);
      await api.register(projectRoutes);
      await api.register(areaRoutes);
    },
    { prefix: "/api" },
  );
}
