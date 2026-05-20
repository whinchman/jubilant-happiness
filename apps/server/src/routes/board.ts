import type { FastifyPluginAsync } from "fastify";
import { asc, eq } from "drizzle-orm";
import type { Board } from "@todoer/shared";
import { db } from "../db/client";
import { tasks } from "../db/schema";

export const boardRoutes: FastifyPluginAsync = async (app) => {
  app.get("/board", async (req) => {
    const rows = db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, req.userId))
      .orderBy(asc(tasks.position))
      .all();

    const board: Board = { ready: [], doing: [], done: [] };
    for (const row of rows) {
      board[row.lane].push(row);
    }
    return board;
  });
};
