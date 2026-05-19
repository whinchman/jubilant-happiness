import "./load-env";
import secureSession from "@fastify/secure-session";
import Fastify from "fastify";
import { ensureAccount } from "./auth";
import { runMigrations } from "./db/migrate";
import { registerRoutes } from "./routes";
import { runWeeklyResetIfDue } from "./services/weekly-reset";

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";

runMigrations();
ensureAccount();
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
    secure: false,
    maxAge: 60 * 60 * 24 * 30,
  },
});

app.get("/health", async () => ({ ok: true, service: "todoer-server" }));

await registerRoutes(app);

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
