import "./load-env";
import Fastify from "fastify";
import { DEV_USER_ID, ensureDevUser } from "./auth";
import { runMigrations } from "./db/migrate";
import { registerRoutes } from "./routes";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

runMigrations();
ensureDevUser();

const app = Fastify({ logger: true });

// Auth seam — Phase 7 replaces this hook with real session resolution.
app.decorateRequest("userId", "");
app.addHook("preHandler", async (req) => {
  req.userId = DEV_USER_ID;
});

app.get("/health", async () => ({ ok: true, service: "todoer-server" }));

await registerRoutes(app);

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
