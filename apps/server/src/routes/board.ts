import type { FastifyPluginAsync } from "fastify";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type { Board, ChoreWithSteps } from "@todoer/shared";
import { db } from "../db/client";
import { megaChores, tasks } from "../db/schema";
import { attachMegaChoreState } from "../services/board-blocked";

export const boardRoutes: FastifyPluginAsync = async (app) => {
  app.get("/board", async (req) => {
    const choreRows = db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, req.userId), isNull(tasks.parentId)))
      .orderBy(asc(tasks.position))
      .all();

    const stepsByParent = new Map<string, ChoreWithSteps["steps"]>();
    if (choreRows.length > 0) {
      const steps = db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, req.userId),
            inArray(
              tasks.parentId,
              choreRows.map((c) => c.id),
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

    // Collect mega-chore membership and titles for any chores with mega_chore_id.
    const megaIds = Array.from(
      new Set(
        choreRows
          .map((c) => c.megaChoreId)
          .filter((v): v is string => v !== null),
      ),
    );
    const megaTitles = new Map<string, string>();
    const totalGroupsByMega = new Map<string, number>();
    if (megaIds.length > 0) {
      const titleRows = db
        .select()
        .from(megaChores)
        .where(
          and(eq(megaChores.userId, req.userId), inArray(megaChores.id, megaIds)),
        )
        .all();
      for (const m of titleRows) megaTitles.set(m.id, m.title);

      // totalGroups = max group across all chores for each mega.
      for (const c of choreRows) {
        if (c.megaChoreId === null || c.megaChoreGroup === null) continue;
        const cur = totalGroupsByMega.get(c.megaChoreId) ?? 0;
        if (c.megaChoreGroup > cur)
          totalGroupsByMega.set(c.megaChoreId, c.megaChoreGroup);
      }
    }

    const memberships = choreRows
      .filter((c) => c.megaChoreId !== null && c.megaChoreGroup !== null)
      .map((c) => ({
        choreId: c.id,
        megaChoreId: c.megaChoreId as string,
        group: c.megaChoreGroup as number,
        completedAt: c.completedAt,
      }));

    const withSteps: ChoreWithSteps[] = choreRows.map((c) => ({
      ...c,
      steps: stepsByParent.get(c.id) ?? [],
    }));
    const decorated = attachMegaChoreState(
      withSteps,
      megaTitles,
      totalGroupsByMega,
      memberships,
    );

    const board: Board = { ready: [], doing: [], done: [] };
    for (const chore of decorated) board[chore.lane].push(chore);
    return board;
  });
};
