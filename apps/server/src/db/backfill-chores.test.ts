import { resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { and, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { backfillChores } from "./backfill-chores";
import * as schema from "./schema";
import { projects, tasks, users } from "./schema";

type DB = BetterSQLite3Database<typeof schema>;

const MIGRATIONS_FOLDER = resolve(import.meta.dirname, "../../drizzle");

function freshDb(): DB {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db;
}

function seedUser(db: DB, id = "user-1"): string {
  db.insert(users)
    .values({
      id,
      username: `${id}-name`,
      passwordHash: "x",
      createdAt: 0,
    })
    .run();
  return id;
}

function seedProject(db: DB, userId: string, id: string, title: string): string {
  db.insert(projects).values({ id, userId, title, createdAt: 0 }).run();
  return id;
}

function seedTask(
  db: DB,
  userId: string,
  overrides: Partial<typeof tasks.$inferInsert>,
): string {
  const id = overrides.id ?? crypto.randomUUID();
  db.insert(tasks)
    .values({
      id,
      userId,
      projectId: null,
      parentId: null,
      title: "task",
      notes: "",
      area: null,
      estimateMinutes: 10,
      lane: "ready",
      position: 1,
      isRepeating: false,
      lastCompletedAt: null,
      completedAt: null,
      createdAt: 0,
      ...overrides,
    })
    .run();
  return id;
}

describe("backfillChores", () => {
  it("groups multi-task projects into a chore + steps and leaves standalone tasks alone", () => {
    const db = freshDb();
    const userId = seedUser(db);

    const kitchenProj = seedProject(db, userId, "p-kitchen", "Clean kitchen");
    seedTask(db, userId, {
      id: "k1",
      projectId: kitchenProj,
      title: "Wipe counter",
      estimateMinutes: 5,
      area: "Home",
      lane: "ready",
      position: 1,
      createdAt: 100,
    });
    seedTask(db, userId, {
      id: "k2",
      projectId: kitchenProj,
      title: "Wash dishes",
      estimateMinutes: 15,
      area: "Home",
      lane: "ready",
      position: 2,
      createdAt: 110,
    });

    seedTask(db, userId, {
      id: "standalone",
      title: "Take out trash",
      estimateMinutes: 5,
      lane: "ready",
      position: 3,
      createdAt: 120,
    });

    backfillChores(db);

    const chores = db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), isNull(tasks.parentId)))
      .all();

    // 1 new chore (for the kitchen project) + 1 standalone — 2 top-level rows.
    expect(chores).toHaveLength(2);

    const kitchenChore = chores.find((c) => c.projectId === kitchenProj);
    expect(kitchenChore).toBeDefined();
    expect(kitchenChore!.title).toBe("Clean kitchen");
    expect(kitchenChore!.area).toBe("Home");
    expect(kitchenChore!.lane).toBe("ready");
    expect(kitchenChore!.estimateMinutes).toBe(5 + 15 + 5); // sum + buffer
    expect(kitchenChore!.createdAt).toBe(100); // oldest child's createdAt

    const k1 = db.select().from(tasks).where(eq(tasks.id, "k1")).get();
    const k2 = db.select().from(tasks).where(eq(tasks.id, "k2")).get();
    expect(k1!.parentId).toBe(kitchenChore!.id);
    expect(k2!.parentId).toBe(kitchenChore!.id);
    expect(k1!.position).toBe(1); // original positions preserved
    expect(k2!.position).toBe(2);

    const standalone = db.select().from(tasks).where(eq(tasks.id, "standalone")).get();
    expect(standalone!.parentId).toBeNull();
  });

  it("is idempotent — running twice produces the same state", () => {
    const db = freshDb();
    const userId = seedUser(db);
    const proj = seedProject(db, userId, "p-yard", "Mow lawn");
    seedTask(db, userId, { id: "y1", projectId: proj, estimateMinutes: 10, position: 1 });
    seedTask(db, userId, { id: "y2", projectId: proj, estimateMinutes: 10, position: 2 });

    backfillChores(db);
    const after1 = db.select().from(tasks).all();
    backfillChores(db);
    const after2 = db.select().from(tasks).all();

    expect(after2).toEqual(after1);
    const chores = after2.filter((t) => t.parentId === null);
    expect(chores).toHaveLength(1);
  });

  it("a project where all children are Done gets a Done chore with a completedAt", () => {
    const db = freshDb();
    const userId = seedUser(db);
    const proj = seedProject(db, userId, "p-done", "Old finished project");
    seedTask(db, userId, {
      id: "d1",
      projectId: proj,
      lane: "done",
      completedAt: 200,
      position: 1,
    });
    seedTask(db, userId, {
      id: "d2",
      projectId: proj,
      lane: "done",
      completedAt: 250,
      position: 2,
    });

    backfillChores(db);

    const chore = db
      .select()
      .from(tasks)
      .where(and(eq(tasks.projectId, proj), isNull(tasks.parentId)))
      .get();
    expect(chore!.lane).toBe("done");
    expect(chore!.completedAt).toBe(250);
  });

  it("a project with mixed Done/Ready children gets a Doing chore", () => {
    const db = freshDb();
    const userId = seedUser(db);
    const proj = seedProject(db, userId, "p-mixed", "Half done project");
    seedTask(db, userId, {
      id: "m1",
      projectId: proj,
      lane: "done",
      completedAt: 200,
      position: 1,
    });
    seedTask(db, userId, { id: "m2", projectId: proj, lane: "ready", position: 2 });

    backfillChores(db);

    const chore = db
      .select()
      .from(tasks)
      .where(and(eq(tasks.projectId, proj), isNull(tasks.parentId)))
      .get();
    expect(chore!.lane).toBe("doing");
    expect(chore!.completedAt).toBeNull();
  });

  it("skips single-task projects (no chore created)", () => {
    const db = freshDb();
    const userId = seedUser(db);
    const proj = seedProject(db, userId, "p-solo", "Lonely project");
    seedTask(db, userId, { id: "s1", projectId: proj, position: 1 });

    backfillChores(db);

    const all = db.select().from(tasks).where(eq(tasks.userId, userId)).all();
    expect(all).toHaveLength(1); // still just the original task — no chore added
    expect(all[0]!.parentId).toBeNull();
  });
});
