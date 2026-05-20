import {
  type AnySQLiteColumn,
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const appMeta = sqliteTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    // Self-FK with default NO ACTION: SQLite's ALTER TABLE ADD COLUMN can't add
    // a cascading FK, so the chore-delete route explicitly removes steps first.
    parentId: text("parent_id").references((): AnySQLiteColumn => tasks.id),
    title: text("title").notNull(),
    notes: text("notes").notNull().default(""),
    area: text("area"),
    estimateMinutes: integer("estimate_minutes").notNull(),
    lane: text("lane", {
      enum: ["ready", "doing", "done"] as const,
    }).notNull(),
    position: real("position").notNull(),
    isRepeating: integer("is_repeating", { mode: "boolean" })
      .notNull()
      .default(false),
    lastCompletedAt: integer("last_completed_at"),
    completedAt: integer("completed_at"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    index("idx_tasks_board").on(t.userId, t.lane, t.position),
    index("idx_tasks_area").on(t.area),
    index("idx_tasks_project").on(t.projectId),
    index("idx_tasks_repeating").on(t.isRepeating, t.lastCompletedAt),
    index("idx_tasks_parent").on(t.parentId, t.position),
  ],
);

export type TaskRow = typeof tasks.$inferSelect;
export type ProjectRow = typeof projects.$inferSelect;
