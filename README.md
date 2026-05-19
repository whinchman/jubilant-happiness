# TODO-ER

A self-hosted, single-user task app built to fight the **activation-energy problem** of getting
started — designed for (and by) someone with ADHD.

The core idea: never show the whole scary pile. You type in a big task, Claude breaks it into
tiny ≤10-minute steps, and a focus mode walks you through them **one at a time**.

> Original concept: [`todoer-idea.md`](./todoer-idea.md)

## Features

- **Kanban board** — 4 lanes (Backlog → Ready → Doing → Done) with touch + mouse drag-and-drop
- **AI task breakdown** — a big task becomes a set of editable, ordered ≤10-minute steps
- **Get Started focus flow** — one task on screen at a time, a stopwatch, work/break intervals,
  and an end-of-session summary
- **Repeating tasks** — flagged tasks reset to Ready every Sunday; staleness bubbles overdue
  chores to the front of a focus session
- **Areas** — tasks are grouped (Kitchen, Yard…) so a focus session stays coherent
- **TV dashboard** — a separate, read-only big-screen board that auto-refreshes
- **Installable PWA**, **username/password auth**, fully **Dockerized**

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
| Deploy       | Docker Compose + nginx; Tailscale for HTTPS |

## Project structure

```
apps/server      Fastify API + SQLite (migrations auto-apply on boot)
apps/phone       React PWA — the main app (board, AI breakdown, focus flow)
apps/dashboard   Read-only big-screen board for a TV / monitor
packages/shared  Shared TypeScript types, zod schemas, and the typed API client
```

The frontends call a relative `/api`; in dev the Vite dev server proxies it to the API, in
production nginx does. The server runs database migrations and the weekly reset on boot.

## Prerequisites

- Node.js **22.12+**
- **pnpm 10+** (`npm install -g pnpm`)
- An **Anthropic API key** — for the AI breakdown
- Docker — only for deployment (optional)

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
| `DATABASE_PATH`      | no       | SQLite file location (default `data/todoer.sqlite`) |
| `PORT` / `HOST`      | no       | Server bind address |
| `PHONE_PORT` / `DASHBOARD_PORT` | no | Docker host ports (default 8190 / 8191) |

## Deployment

```bash
# 1. Set ANTHROPIC_API_KEY and SESSION_SECRET in .env
# 2. Build and start the stack
docker compose up -d --build
```

Three containers come up: the API server (internal), the phone app on **:8190**, and the
dashboard on **:8191**. The SQLite database lives in the `todoer-data` Docker volume.

For HTTPS — required for installing the PWA to a phone home screen — put Tailscale in front:

```bash
tailscale serve --bg 8190
```

That gives an `https://<machine>.<tailnet>.ts.net` URL; open it on your phone and "Add to Home
Screen". (Check `tailscale serve --help` — flags vary by version.)

## Testing

`pnpm test` runs Vitest: the server suite covers the focus-session **selection algorithm** and
staleness scoring; the phone suite covers the drag-and-drop **fractional-position math**.

## Data

A single SQLite file holds everything (`apps/server/data/todoer.sqlite` in dev, the
`todoer-data` volume in Docker). Back it up by copying that file.
