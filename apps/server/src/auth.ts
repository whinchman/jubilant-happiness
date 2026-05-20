import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { users } from "./db/schema";

declare module "fastify" {
  interface FastifyRequest {
    /** The id of the user owning this request — set by the guarded routes' preHandler. */
    userId: string;
  }
}

declare module "@fastify/secure-session" {
  interface SessionData {
    /** The id of the logged-in user. Presence implies authenticated. */
    userId: string;
  }
}

export function findUserByUsername(username: string) {
  return db.select().from(users).where(eq(users.username, username)).get();
}

export function findUserById(id: string) {
  return db.select().from(users).where(eq(users.id, id)).get();
}

export function countUsers(): number {
  return db.select().from(users).all().length;
}

export function createUser(input: { username: string; password: string }): {
  id: string;
} {
  const id = randomUUID();
  db.insert(users)
    .values({
      id,
      username: input.username,
      passwordHash: hashPassword(input.password),
      createdAt: Date.now(),
    })
    .run();
  return { id };
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
