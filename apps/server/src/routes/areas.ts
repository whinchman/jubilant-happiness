import type { FastifyPluginAsync } from "fastify";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "../db/client";
import { tasks } from "../db/schema";

export const areaRoutes: FastifyPluginAsync = async (app) => {
  app.get("/areas", async (req) => {
    const rows = db
      .selectDistinct({ area: tasks.area })
      .from(tasks)
      .where(and(eq(tasks.userId, req.userId), isNotNull(tasks.area)))
      .all();
    return rows
      .map((r) => r.area)
      .filter((a): a is string => a !== null)
      .sort((x, y) => x.localeCompare(y));
  });
};
