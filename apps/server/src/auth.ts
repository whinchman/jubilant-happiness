import { db } from "./db/client";
import { users } from "./db/schema";

/**
 * Phase 1 auth seam. Every request resolves to this fixed dev user; Phase 7
 * replaces the request hook with real session auth without touching routes.
 */
export const DEV_USER_ID = "dev-user";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
}

/** Guarantees the fixed dev user row exists so task/project FKs resolve. */
export function ensureDevUser(): void {
  db.insert(users)
    .values({
      id: DEV_USER_ID,
      username: "dev",
      passwordHash: "",
      createdAt: Date.now(),
    })
    .onConflictDoNothing()
    .run();
}
