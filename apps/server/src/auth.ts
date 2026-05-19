import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { users } from "./db/schema";

/** Fixed id for the single account — stable so existing tasks stay attached. */
export const ACCOUNT_ID = "dev-user";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
}

declare module "@fastify/secure-session" {
  interface SessionData {
    authed: boolean;
  }
}

/** Ensures the single account row exists; credentials are filled in by setup. */
export function ensureAccount(): void {
  db.insert(users)
    .values({ id: ACCOUNT_ID, username: "", passwordHash: "", createdAt: Date.now() })
    .onConflictDoNothing()
    .run();
}

export function getAccount() {
  return db.select().from(users).where(eq(users.id, ACCOUNT_ID)).get();
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), 64);
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}
