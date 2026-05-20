import type { FastifyPluginAsync } from "fastify";
import { credentialsSchema, setupSchema } from "@todoer/shared";
import {
  countUsers,
  createUser,
  findUserById,
  findUserByUsername,
  verifyPassword,
} from "../auth";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.get("/auth/status", async (req) => {
    const userId = req.session.get("userId");
    const authenticated =
      typeof userId === "string" && findUserById(userId) !== undefined;
    return {
      needsSetup: countUsers() === 0,
      authenticated,
      requiresSetupToken: !!process.env.SETUP_TOKEN,
    };
  });

  app.post("/auth/setup", async (req, reply) => {
    const parsed = setupSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "invalid_input", issues: parsed.error.issues });
    }
    const requiredToken = process.env.SETUP_TOKEN;
    if (requiredToken && parsed.data.setupToken !== requiredToken) {
      return reply.code(401).send({ error: "invalid_setup_token" });
    }
    if (findUserByUsername(parsed.data.username)) {
      return reply.code(409).send({ error: "username_taken" });
    }
    const { id } = createUser({
      username: parsed.data.username,
      password: parsed.data.password,
    });
    req.session.set("userId", id);
    return { ok: true };
  });

  app.post(
    "/auth/login",
    { config: { rateLimit: { max: 5, timeWindow: "15 minutes" } } },
    async (req, reply) => {
      const parsed = credentialsSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: "invalid_input", issues: parsed.error.issues });
      }
      const user = findUserByUsername(parsed.data.username);
      if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
        return reply.code(401).send({ error: "invalid_credentials" });
      }
      req.session.set("userId", user.id);
      return { ok: true };
    },
  );

  app.post("/auth/logout", async (req, reply) => {
    req.session.delete();
    return reply.code(204).send();
  });
};
