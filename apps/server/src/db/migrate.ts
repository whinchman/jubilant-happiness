import { resolve } from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, rawDb } from "./client";

/** Applies any pending Drizzle migrations. Run on every server boot — idempotent. */
export function runMigrations(): void {
  migrate(db, {
    migrationsFolder: resolve(import.meta.dirname, "../../drizzle"),
  });
  // The Backlog lane was removed in a refactor — surface any leftover rows in Ready.
  rawDb.prepare("UPDATE tasks SET lane = 'ready' WHERE lane = 'backlog'").run();
}
