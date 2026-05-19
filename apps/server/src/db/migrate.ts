import { resolve } from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./client";

/** Applies any pending Drizzle migrations. Run on every server boot — idempotent. */
export function runMigrations(): void {
  migrate(db, {
    migrationsFolder: resolve(import.meta.dirname, "../../drizzle"),
  });
}
