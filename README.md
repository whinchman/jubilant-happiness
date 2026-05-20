# TODO-ER

A self-hosted, single-user task app built to fight the **activation-energy problem** of getting
started — designed for (and by) someone with ADHD.

The core idea: never show the whole scary pile. You type in a big task, Claude breaks it into
tiny ≤10-minute steps, and a focus mode walks you through them **one at a time**.

> Original concept: [`todoer-idea.md`](./todoer-idea.md)

## Features

- **Kanban board** — 3 lanes (Ready → Doing → Done) with touch + mouse drag-and-drop
- **AI task breakdown** — a big task becomes a set of editable, ordered ≤10-minute steps
- **Get Started focus flow** — one task on screen at a time, a stopwatch, work/break intervals,
  and an end-of-session summary
- **Repeating tasks** — flagged tasks reset to Ready every Sunday; staleness bubbles overdue
  chores to the front of a focus session
- **Areas** — tasks are grouped (Kitchen, Yard…) so a focus session stays coherent
- **TV dashboard** — a separate, read-only big-screen board that auto-refreshes
- **Installable PWA**, **username/password auth**

## Stack

| Layer        | Choice |
|--------------|--------|
| Monorepo     | pnpm workspaces, TypeScript 6 |
| Backend      | Fastify 5, SQLite via Drizzle ORM + better-sqlite3 |
| AI           | `@anthropic-ai/sdk` — Claude Sonnet 4.6, forced tool-call |
| Auth         | `@fastify/secure-session` (encrypted cookie) + scrypt hashing |
| Frontend     | React 19, Vite 8, MUI v9, TanStack Query 5, React Router 7 |
| Drag & drop  | dnd-kit |
| PWA          | vite-plugin-pwa |
| Deploy       | Render.com (Docker); Docker Compose available as a homelab alternative |

## Project structure

```
apps/server      Fastify API + SQLite (migrations auto-apply on boot)
apps/phone       React PWA — the main app (board, AI breakdown, focus flow)
apps/dashboard   Read-only big-screen board for a TV / monitor
packages/shared  Shared TypeScript types, zod schemas, and the typed API client
```

The phone calls a relative `/api`; in dev the Vite dev server proxies it to the API, in production
the server serves both the API and the built phone PWA on the same origin.

## Prerequisites

- Node.js **22.12+**
- **pnpm 10+** (`npm install -g pnpm`)
- An **Anthropic API key** — for the AI breakdown
- Docker — only for the self-host alternative (optional)

## Setup

```bash
pnpm install
cp .env.example .env        # then fill in ANTHROPIC_API_KEY
pnpm dev
```

`pnpm dev` starts all three apps in parallel:

| App        | URL                     |
|------------|-------------------------|
| API server | http://localhost:3000   |
| Phone app  | http://localhost:5173   |
| Dashboard  | http://localhost:5174   |

Open the phone app — the **first run shows a Setup screen** where you create your account. To use
it from an actual phone, open the Network URL that Vite prints (same Wi-Fi).

## Scripts

Run from the repo root:

| Command           | Does |
|-------------------|------|
| `pnpm dev`        | Runs server + phone + dashboard in watch mode |
| `pnpm build`      | Production build of both frontends |
| `pnpm typecheck`  | Typechecks every package |
| `pnpm test`       | Runs the Vitest suites |

Server-only (`pnpm --filter @todoer/server <script>`): `db:generate` regenerates Drizzle
migrations from the schema; `start` runs the server without watch.

## Environment variables

Read from `.env` (repo root). See [`.env.example`](./.env.example).

| Variable             | Required | Notes |
|----------------------|----------|-------|
| `ANTHROPIC_API_KEY`  | yes      | Powers the AI breakdown |
| `ANTHROPIC_MODEL`    | no       | Default `claude-sonnet-4-6` |
| `SESSION_SECRET`     | deploy   | Session cookie encryption — set a long random string |
| `NODE_ENV`           | deploy   | Set to `production` so the server serves the phone PWA + secure cookies |
| `DATABASE_PATH`      | no       | SQLite file location (default `data/todoer.sqlite`) |
| `PORT` / `HOST`      | no       | Server bind address |
| `PHONE_PORT` / `DASHBOARD_PORT` | no | Docker host ports (default 8190 / 8191) |

## Deployment

TODO-ER deploys to **Render.com** as a single Web Service that builds the phone PWA and serves it
alongside the API at one custom domain — no separate static host, no CORS, the session cookie just
works.

1. Push the repo to a Git host (GitHub / GitLab) that Render can read.
2. In Render, **New → Blueprint** → connect the repo. Render reads [`render.yaml`](./render.yaml)
   and provisions the service plus a 1GB persistent disk.
3. After it provisions, paste secrets in **Environment**:
   - `ANTHROPIC_API_KEY` — your Anthropic key.
   - `SESSION_SECRET`, `ANTHROPIC_MODEL`, `NODE_ENV`, and `DATABASE_PATH` are set by the blueprint.
4. **Settings → Custom Domains** → add e.g. `todoer.217industries.com`. Render shows a CNAME target.
5. In your DNS, add a `todoer` CNAME record pointing to Render's target. Render auto-issues SSL via
   Let's Encrypt once the CNAME resolves.
6. Open `https://todoer.217industries.com` → fresh database → Setup screen → create your account.

**Cost:** Render's Starter plan (~$7/month) is required — the free plan sleeps and has no
persistent disk.

### Self-host alternative (Docker + Tailscale)

The Docker Compose setup is still in the repo for a homelab install:

```bash
# 1. Set ANTHROPIC_API_KEY and SESSION_SECRET in .env
docker compose up -d --build
```

Three containers come up: the API server (internal), the phone app on `:8190`, and the dashboard
on `:8191`, with the SQLite database in the `todoer-data` Docker volume. For HTTPS — required to
install the PWA on a phone home screen — put Tailscale in front:

```bash
tailscale serve --bg 8190
```

That gives an `https://<machine>.<tailnet>.ts.net` URL; open it on your phone and "Add to Home
Screen". (Check `tailscale serve --help` — flags vary by version.)

## Testing

`pnpm test` runs Vitest: the server suite covers the focus-session **selection algorithm** and
staleness scoring; the phone suite covers the drag-and-drop **fractional-position math**.

## Data

A single SQLite file holds everything (`apps/server/data/todoer.sqlite` in dev, the `todoer-data`
Docker volume in compose, the Render persistent disk at `/var/data/todoer.sqlite` in production).
Back it up by copying that file.
