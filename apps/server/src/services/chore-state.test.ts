import { resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import * as schema from "../db/schema";
import { tasks, users } from "../db/schema";
import { reconcileChoreLane } from "./chore-state";

type DB = BetterSQLite3Database<typeof schema>;

const MIGRATIONS_FOLDER = resolve(import.meta.dirname, "../../drizzle");
const NOW = 1_000_000;

function freshDb(): DB {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  db.insert(users)
    .values({ id: "u", username: "u", passwordHash: "x", createdAt: 0 })
    .run();
  return db;
}

interface SeedOpts {
  lane?: "ready" | "doing" | "done";
  isRepeating?: boolean;
  completedAt?: number | null;
  position?: number;
}

function seedChore(db: DB, id: string, opts: SeedOpts = {}): void {
  db.insert(tasks)
    .values({
      id,
      userId: "u",
      projectId: null,
      parentId: null,
      title: id,
      notes: "",
      area: null,
      estimateMinutes: 10,
      lane: opts.lane ?? "ready",
      position: opts.position ?? 1,
      isRepeating: opts.isRepeating ?? false,
      lastCompletedAt: null,
      completedAt: opts.completedAt ?? null,
      createdAt: 0,
    })
    .run();
}

function seedStep(
  db: DB,
  parentId: string,
  id: string,
  opts: { completedAt?: number | null; position?: number } = {},
): void {
  db.insert(tasks)
    .values({
      id,
      userId: "u",
      projectId: null,
      parentId,
      title: id,
      notes: "",
      area: null,
      estimateMinutes: 5,
      lane: "ready",
      position: opts.position ?? 1,
      isRepeating: false,
      lastCompletedAt: null,
      completedAt: opts.completedAt ?? null,
      createdAt: 0,
    })
    .run();
}

function laneOf(db: DB, id: string): string | undefined {
  return db.select().from(tasks).where(eq(tasks.id, id)).get()?.lane;
}

describe("reconcileChoreLane", () => {
  let db: DB;
  beforeEach(() => {
    db = freshDb();
  });

  it("is a no-op for a chore with no steps", () => {
    seedChore(db, "c1", { lane: "ready" });
    reconcileChoreLane(db, "c1", NOW);
    expect(laneOf(db, "c1")).toBe("ready");
  });

  it("auto-promotes Ready → Doing when the first step is checked", () => {
    seedChore(db, "c1", { lane: "ready" });
    seedStep(db, "c1", "s1", { completedAt: NOW, position: 1 });
    seedStep(db, "c1", "s2", { completedAt: null, position: 2 });

    reconcileChoreLane(db, "c1", NOW);
    expect(laneOf(db, "c1")).toBe("doing");
  });

  it("stays Ready when no step is yet checked", () => {
    seedChore(db, "c1", { lane: "ready" });
    seedStep(db, "c1", "s1", { completedAt: null });
    seedStep(db, "c1", "s2", { completedAt: null });

    reconcileChoreLane(db, "c1", NOW);
    expect(laneOf(db, "c1")).toBe("ready");
  });

  it("auto-promotes Doing → Done when the last step is checked", () => {
    seedChore(db, "c1", { lane: "doing" });
    seedStep(db, "c1", "s1", { completedAt: NOW - 100, position: 1 });
    seedStep(db, "c1", "s2", { completedAt: NOW, position: 2 });

    reconcileChoreLane(db, "c1", NOW);
    const chore = db.select().from(tasks).where(eq(tasks.id, "c1")).get();
    expect(chore!.lane).toBe("done");
    expect(chore!.completedAt).toBe(NOW);
  });

  it("sets lastCompletedAt on a repeating chore that auto-promotes to Done", () => {
    seedChore(db, "c1", { lane: "doing", isRepeating: true });
    seedStep(db, "c1", "s1", { completedAt: NOW });

    reconcileChoreLane(db, "c1", NOW);
    const chore = db.select().from(tasks).where(eq(tasks.id, "c1")).get();
    expect(chore!.lastCompletedAt).toBe(NOW);
  });

  it("does NOT touch lastCompletedAt for a non-repeating chore going Done", () => {
    seedChore(db, "c1", { lane: "doing", isRepeating: false });
    seedStep(db, "c1", "s1", { completedAt: NOW });

    reconcileChoreLane(db, "c1", NOW);
    const chore = db.select().from(tasks).where(eq(tasks.id, "c1")).get();
    expect(chore!.lastCompletedAt).toBeNull();
  });

  it("moves Done → Doing when a step is unchecked from a fully-completed chore", () => {
    seedChore(db, "c1", { lane: "done", completedAt: NOW - 100 });
    seedStep(db, "c1", "s1", { completedAt: NOW - 100, position: 1 });
    seedStep(db, "c1", "s2", { completedAt: null, position: 2 }); // just unchecked

    reconcileChoreLane(db, "c1", NOW);
    const chore = db.select().from(tasks).where(eq(tasks.id, "c1")).get();
    expect(chore!.lane).toBe("doing");
    expect(chore!.completedAt).toBeNull();
  });

  it("leaves a chore already in Doing alone if more steps still need checking", () => {
    seedChore(db, "c1", { lane: "doing" });
    seedStep(db, "c1", "s1", { completedAt: NOW - 100 });
    seedStep(db, "c1", "s2", { completedAt: null });

    reconcileChoreLane(db, "c1", NOW);
    expect(laneOf(db, "c1")).toBe("doing");
  });

  it("does nothing for a non-chore id (a step) — safety against misuse", () => {
    seedChore(db, "c1", { lane: "ready" });
    seedStep(db, "c1", "s1");

    reconcileChoreLane(db, "s1", NOW);
    expect(laneOf(db, "c1")).toBe("ready");
    expect(laneOf(db, "s1")).toBe("ready");
  });
});
