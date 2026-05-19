import type { FastifyPluginAsync } from "fastify";
import { eq } from "drizzle-orm";
import { credentialsSchema } from "@todoer/shared";
import {
  ACCOUNT_ID,
  getAccount,
  hashPassword,
  verifyPassword,
} from "../auth";
import { db } from "../db/client";
import { users } from "../db/schema";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.get("/auth/status", async (req) => {
    const account = getAccount();
    return {
      needsSetup: !account || account.passwordHash === "",
      authenticated: req.session.get("authed") === true,
    };
  });

  app.post("/auth/setup", async (req, reply) => {
    const account = getAccount();
    if (account && account.passwordHash !== "") {
      return reply.code(409).send({ error: "already_setup" });
    }
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
    }
    db.update(users)
      .set({
        username: parsed.data.username,
        passwordHash: hashPassword(parsed.data.password),
      })
      .where(eq(users.id, ACCOUNT_ID))
      .run();
    req.session.set("authed", true);
    return { ok: true };
  });

  app.post("/auth/login", async (req, reply) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
    }
    const account = getAccount();
    if (
      !account ||
      account.passwordHash === "" ||
      account.username !== parsed.data.username ||
      !verifyPassword(parsed.data.password, account.passwordHash)
    ) {
      return reply.code(401).send({ error: "invalid_credentials" });
    }
    req.session.set("authed", true);
    return { ok: true };
  });

  app.post("/auth/logout", async (req, reply) => {
    req.session.delete();
    return reply.code(204).send();
  });
};
