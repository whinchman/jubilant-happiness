import { resolve } from "node:path";

/**
 * Loads environment variables from a .env file before any other module runs.
 * Checks the repo root first, then apps/server — either location works.
 */
const candidates = [
  resolve(import.meta.dirname, "../../../.env"),
  resolve(import.meta.dirname, "../.env"),
];

for (const path of candidates) {
  try {
    process.loadEnvFile(path);
  } catch {
    // No .env at this path — fall through to the next candidate / ambient env.
  }
}
