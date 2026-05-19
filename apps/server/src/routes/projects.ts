import type { FastifyPluginAsync } from "fastify";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { projects } from "../db/schema";

export const projectRoutes: FastifyPluginAsync = async (app) => {
  app.get("/projects", async (req) => {
    return db
      .select()
      .from(projects)
      .where(eq(projects.userId, req.userId))
      .orderBy(asc(projects.createdAt))
      .all();
  });

  app.delete<{ Params: { id: string } }>("/projects/:id", async (req, reply) => {
    const existing = db
      .select()
      .from(projects)
      .where(and(eq(projects.id, req.params.id), eq(projects.userId, req.userId)))
      .get();
    if (!existing) return reply.code(404).send({ error: "not_found" });
    db.delete(projects).where(eq(projects.id, req.params.id)).run();
    return reply.code(204).send();
  });
};
