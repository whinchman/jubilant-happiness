import "./load-env";
import { resolve } from "node:path";
import rateLimit from "@fastify/rate-limit";
import secureSession from "@fastify/secure-session";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { runMigrations } from "./db/migrate";
import { registerRoutes } from "./routes";
import { runWeeklyResetIfDue } from "./services/weekly-reset";

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";
const isProduction = process.env.NODE_ENV === "production";

runMigrations();
runWeeklyResetIfDue();

const app = Fastify({ logger: true });
app.decorateRequest("userId", "");

await app.register(secureSession, {
  secret:
    process.env.SESSION_SECRET ||
    "todoer-development-secret-change-me-in-production",
  salt: "todoerSaltValue1",
  cookieName: "todoer_session",
  cookie: {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: 60 * 60 * 24 * 30,
  },
});

// Rate-limit plugin — opt-in per route via `config.rateLimit`.
await app.register(rateLimit, { global: false });

app.get("/health", async () => ({ ok: true, service: "todoer-server" }));

await registerRoutes(app);

// In production we also serve the built phone PWA from this same origin — no CORS, no separate
// nginx, the session cookie just works. In dev, the phone runs on Vite at :5173 with a proxy
// back to /api here, so we skip static serving entirely.
if (isProduction) {
  const phoneDist = resolve(import.meta.dirname, "../../phone/dist");
  await app.register(fastifyStatic, {
    root: phoneDist,
    prefix: "/",
  });
  app.setNotFoundHandler(async (req, reply) => {
    if (req.url.startsWith("/api/")) {
      return reply.code(404).send({ error: "not_found" });
    }
    return reply.sendFile("index.html");
  });
}

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
