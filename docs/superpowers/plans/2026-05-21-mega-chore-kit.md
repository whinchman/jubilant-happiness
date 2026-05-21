# Mega-Chore Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the mega-chore kit — a clarifying-chat flow that turns one "huge thing" into 2–10 ordered chores grouped under a shared mega-chore, with parallel-group dependencies, a divider inside the Ready lane for blocked chores, and a multi-chore breakdown review screen.

**Architecture:**
- Server: new SQLite table `mega_chores`; two nullable columns on `tasks` (`mega_chore_id`, `mega_chore_group`); `isBlocked` is **derived** on board reads from group completion (no stored "blocked" flag). New Claude-backed service `services/kits/mega-chore.ts` with a forced tool call returning a discriminated `{question | breakdown}` per turn.
- Client: new `MegaChoreKitScreen` (two states: initial textarea, then chat thread); new `MultiChoreBreakdownReview` component; `Lane`/`TaskCard`/`EditTaskDialog` updated to render the divider, mega-chore chip, and muted-blocked styling.
- Reuses: the existing kits-route plugin, `BreakdownReview` step-row UI, kit suggestion hook on `/api/breakdown`.

**Tech Stack:** TypeScript, Fastify (server), Drizzle ORM + better-sqlite3, React + MUI + react-router (phone), @anthropic-ai/sdk, zod, tanstack-query, vitest.

**Spec:** `docs/superpowers/specs/2026-05-21-mega-chore-kit-design.md`

---

## File Structure

**Shared (`packages/shared/src/`)**
- Modify `types.ts` — add `MegaChoreRef`, extend `ChoreWithSteps`, add `ChatMessage`.
- Modify `schemas.ts` — add `chatMessageSchema`, `megaChoreTurnRequestSchema`, `megaChoreBreakdownPreviewSchema`, `megaChoreTurnResponseSchema`, `acceptMegaChoreBreakdownSchema`.
- Modify `schemas.test.ts` — add schema-validation cases.
- Modify `api.ts` — add `postMegaChoreTurn`, `acceptMegaChoreBreakdown`.

**Server (`apps/server/`)**
- Create `drizzle/0002_mega_chores.sql` — migration: new table + two columns.
- Modify `src/db/schema.ts` — add `megaChores` table and the two new columns on `tasks`.
- Create `src/services/board-blocked.ts` — pure `attachMegaChoreState(chores)`.
- Create `src/services/board-blocked.test.ts`.
- Modify `src/routes/board.ts` — attach `megaChore` + `isBlocked` per chore.
- Modify `src/routes/tasks.ts` — `/tasks/:id/move` rejects blocked → doing with 409.
- Create `src/services/kits/mega-chore.ts` — prompts, Claude call, parser, accept transaction.
- Create `src/services/kits/mega-chore.test.ts` — pure-function tests.
- Modify `src/routes/kits.ts` — add `/kits/mega-chore/turn` and `/kits/mega-chore/accept`.
- Modify `src/services/breakdown.ts` — extend system prompt + service-prompt comment to mention `mega-chore`.

**Phone (`apps/phone/`)**
- Modify `src/kits/registry.ts` — `enabled: true` for `mega-chore`.
- Modify `src/kits/registry.test.ts`.
- Create `src/kits/mega-chore/MegaChoreKitScreen.tsx`.
- Create `src/kits/mega-chore/use-mega-chore-turn.ts`.
- Create `src/kits/mega-chore/use-mega-chore-accept.ts`.
- Create `src/components/MultiChoreBreakdownReview.tsx`.
- Modify `src/components/Lane.tsx` — split on `isBlocked`, render divider.
- Modify `src/components/TaskCard.tsx` — chip + muted+collapsed when blocked.
- Modify `src/components/EditTaskDialog.tsx` — read-only chip when `chore.megaChore` set.
- Modify `src/App.tsx` — add `/add/kit/mega-chore` route.

Why these boundaries: each kit's prompt/Claude wiring/accept transaction lives in `services/kits/<name>.ts` (mirrors `packing.ts`). The board-blocked derivation is a pure function so it's trivially testable without the full route stack. The chat screen is one component because the two states share enough wiring (location-state prefill, error rendering) that splitting would be net loss.

---

### Task 1: Shared types and schemas for mega-chore data

**Files:**
- Modify: `packages/shared/src/types.ts`
- Modify: `packages/shared/src/schemas.ts`
- Modify: `packages/shared/src/schemas.test.ts`

- [ ] **Step 1: Add the failing schema tests**

Append to `packages/shared/src/schemas.test.ts`:

```ts
import {
  chatMessageSchema,
  megaChoreTurnRequestSchema,
  megaChoreBreakdownPreviewSchema,
  acceptMegaChoreBreakdownSchema,
} from "./schemas";

describe("chatMessageSchema", () => {
  it("accepts a user message", () => {
    expect(
      chatMessageSchema.safeParse({ role: "user", content: "hello" }).success,
    ).toBe(true);
  });
  it("rejects an unknown role", () => {
    expect(
      chatMessageSchema.safeParse({ role: "system", content: "x" }).success,
    ).toBe(false);
  });
  it("rejects empty content", () => {
    expect(
      chatMessageSchema.safeParse({ role: "user", content: "" }).success,
    ).toBe(false);
  });
});

describe("megaChoreTurnRequestSchema", () => {
  it("accepts a single user message", () => {
    expect(
      megaChoreTurnRequestSchema.safeParse({
        messages: [{ role: "user", content: "clean the garage" }],
      }).success,
    ).toBe(true);
  });
  it("accepts forceFinalize: true", () => {
    expect(
      megaChoreTurnRequestSchema.safeParse({
        messages: [{ role: "user", content: "x" }],
        forceFinalize: true,
      }).success,
    ).toBe(true);
  });
  it("rejects empty messages array", () => {
    expect(
      megaChoreTurnRequestSchema.safeParse({ messages: [] }).success,
    ).toBe(false);
  });
});

const validPreview = {
  megaChore: { title: "Clean the garage" },
  area: "Garage",
  chores: [
    {
      title: "clear the floor",
      estimateMinutes: 60,
      group: 1,
      steps: [{ title: "scan floor", estimateMinutes: 5 }],
    },
    {
      title: "sort the shelves",
      estimateMinutes: 90,
      group: 2,
      steps: [{ title: "pull boxes", estimateMinutes: 10 }],
    },
  ],
};

describe("megaChoreBreakdownPreviewSchema", () => {
  it("accepts a 2-chore preview with consecutive groups", () => {
    expect(megaChoreBreakdownPreviewSchema.safeParse(validPreview).success).toBe(
      true,
    );
  });
  it("rejects fewer than 2 chores", () => {
    expect(
      megaChoreBreakdownPreviewSchema.safeParse({
        ...validPreview,
        chores: validPreview.chores.slice(0, 1),
      }).success,
    ).toBe(false);
  });
  it("rejects more than 10 chores", () => {
    const many = Array.from({ length: 11 }, (_, i) => ({
      title: `c${i}`,
      estimateMinutes: 10,
      group: i + 1,
      steps: [{ title: "s", estimateMinutes: 5 }],
    }));
    expect(
      megaChoreBreakdownPreviewSchema.safeParse({
        ...validPreview,
        chores: many,
      }).success,
    ).toBe(false);
  });
  it("rejects a chore with zero steps", () => {
    expect(
      megaChoreBreakdownPreviewSchema.safeParse({
        ...validPreview,
        chores: [
          { ...validPreview.chores[0], steps: [] },
          validPreview.chores[1],
        ],
      }).success,
    ).toBe(false);
  });
  it("rejects a chore with more than 30 steps", () => {
    const steps = Array.from({ length: 31 }, (_, i) => ({
      title: `s${i}`,
      estimateMinutes: 5,
    }));
    expect(
      megaChoreBreakdownPreviewSchema.safeParse({
        ...validPreview,
        chores: [{ ...validPreview.chores[0], steps }, validPreview.chores[1]],
      }).success,
    ).toBe(false);
  });
  it("rejects a gap in group sequence (1,3)", () => {
    expect(
      megaChoreBreakdownPreviewSchema.safeParse({
        ...validPreview,
        chores: [
          { ...validPreview.chores[0], group: 1 },
          { ...validPreview.chores[1], group: 3 },
        ],
      }).success,
    ).toBe(false);
  });
  it("accepts parallel chores sharing a group (1,1,2)", () => {
    expect(
      megaChoreBreakdownPreviewSchema.safeParse({
        ...validPreview,
        chores: [
          { ...validPreview.chores[0], group: 1 },
          { ...validPreview.chores[0], title: "b", group: 1 },
          { ...validPreview.chores[1], group: 2 },
        ],
      }).success,
    ).toBe(true);
  });
  it("rejects empty mega-chore title", () => {
    expect(
      megaChoreBreakdownPreviewSchema.safeParse({
        ...validPreview,
        megaChore: { title: "   " },
      }).success,
    ).toBe(false);
  });
});

describe("acceptMegaChoreBreakdownSchema", () => {
  it("accepts a valid preview", () => {
    expect(acceptMegaChoreBreakdownSchema.safeParse(validPreview).success).toBe(
      true,
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @todoer/shared test -- --run`
Expected: FAIL — schemas/exports not defined.

- [ ] **Step 3: Add the shared types**

Append to `packages/shared/src/types.ts` (above `AuthStatus`):

```ts
/** Identifies and locates a chore inside a mega-chore. Set by board reads. */
export interface MegaChoreRef {
  id: string;
  title: string;
  /** 1-indexed parallel-group index this chore belongs to. */
  group: number;
  /** Total number of parallel groups in this mega-chore. */
  totalGroups: number;
}

/** One turn in the mega-chore-kit clarifying chat. */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
```

Replace the existing `ChoreWithSteps` interface in `packages/shared/src/types.ts` with:

```ts
/** A chore as returned by the board API — its steps embedded in position order. */
export interface ChoreWithSteps extends Task {
  steps: Task[];
  /** Set when this chore is part of a mega-chore; omitted otherwise. */
  megaChore?: MegaChoreRef;
  /** True when this mega-chore chore is in a group later than the unblocked-through group. */
  isBlocked?: boolean;
}
```

Add at the bottom of `packages/shared/src/types.ts`:

```ts
/** Preview produced by the mega-chore kit and confirmed by the multi-chore review. */
export interface MegaChoreBreakdownPreview {
  megaChore: { title: string };
  /** Shared area applied to all chores in the mega-chore. */
  area: string;
  chores: Array<{
    title: string;
    estimateMinutes: number;
    group: number;
    steps: Array<{ title: string; estimateMinutes: number; notes?: string }>;
  }>;
}

/** Discriminated turn response from /kits/mega-chore/turn. */
export type MegaChoreTurn =
  | { kind: "question"; assistantMessage: string }
  | { kind: "breakdown"; preview: MegaChoreBreakdownPreview };
```

- [ ] **Step 4: Add the shared schemas**

Append to `packages/shared/src/schemas.ts`:

```ts
export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;

export const megaChoreTurnRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(40),
  forceFinalize: z.boolean().optional(),
});
export type MegaChoreTurnRequest = z.infer<typeof megaChoreTurnRequestSchema>;

const megaChoreStepSchema = z.object({
  title: z.string().trim().min(1).max(200),
  estimateMinutes: z.number().int().min(1).max(240),
  notes: z.string().max(2000).optional(),
});

const megaChoreChoreSchema = z.object({
  title: z.string().trim().min(1).max(200),
  estimateMinutes: z.number().int().min(1).max(600),
  group: z.number().int().min(1).max(20),
  steps: z.array(megaChoreStepSchema).min(1).max(30),
});

export const megaChoreBreakdownPreviewSchema = z
  .object({
    megaChore: z.object({ title: z.string().trim().min(1).max(80) }),
    area: z.string().trim().min(1).max(60),
    chores: z.array(megaChoreChoreSchema).min(2).max(10),
  })
  .refine(
    (data) => {
      // Groups must form a consecutive 1..K sequence (no gaps; parallel groups allowed).
      const unique = Array.from(new Set(data.chores.map((c) => c.group))).sort(
        (a, b) => a - b,
      );
      if (unique[0] !== 1) return false;
      for (let i = 1; i < unique.length; i++) {
        if (unique[i] !== unique[i - 1] + 1) return false;
      }
      return true;
    },
    { message: "groups must be consecutive 1..K with no gaps" },
  );
export type MegaChoreBreakdownPreviewInput = z.infer<
  typeof megaChoreBreakdownPreviewSchema
>;

export const megaChoreTurnResponseSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("question"),
    assistantMessage: z.string().trim().min(1).max(2000),
  }),
  z.object({
    kind: z.literal("breakdown"),
    preview: megaChoreBreakdownPreviewSchema,
  }),
]);
export type MegaChoreTurnResponse = z.infer<typeof megaChoreTurnResponseSchema>;

/** Body for /kits/mega-chore/accept — same shape as the preview, post-edit. */
export const acceptMegaChoreBreakdownSchema = megaChoreBreakdownPreviewSchema;
export type AcceptMegaChoreBreakdownInput = z.infer<
  typeof acceptMegaChoreBreakdownSchema
>;
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @todoer/shared test -- --run`
Expected: PASS, including the new mega-chore cases.

- [ ] **Step 6: Type-check the workspace**

Run: `pnpm -r typecheck`
Expected: PASS (no errors). If `pnpm -r typecheck` isn't wired, run `pnpm --filter @todoer/shared tsc --noEmit` and the equivalent in `apps/server` and `apps/phone`.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/types.ts packages/shared/src/schemas.ts packages/shared/src/schemas.test.ts
git commit -m "feat(shared): mega-chore types and schemas"
```

---

### Task 2: Database migration + schema

**Files:**
- Create: `apps/server/drizzle/0002_mega_chores.sql`
- Modify: `apps/server/src/db/schema.ts`

- [ ] **Step 1: Write the migration**

Create `apps/server/drizzle/0002_mega_chores.sql`:

```sql
CREATE TABLE `mega_chores` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `title` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `tasks` ADD `mega_chore_id` text REFERENCES mega_chores(id);--> statement-breakpoint
ALTER TABLE `tasks` ADD `mega_chore_group` integer;--> statement-breakpoint
CREATE INDEX `idx_tasks_mega_chore` ON `tasks` (`mega_chore_id`,`mega_chore_group`);
```

Note: SQLite cannot enforce conditional check constraints across columns added via ALTER TABLE; we validate the "group present iff id present" invariant in service code instead.

- [ ] **Step 2: Update Drizzle schema**

Modify `apps/server/src/db/schema.ts`. Add this export above `tasks`:

```ts
export const megaChores = sqliteTable("mega_chores", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: integer("created_at").notNull(),
});
```

In the `tasks` table definition, add the two columns (just before `createdAt`) and the new index in the `(t) => [...]` block:

```ts
    megaChoreId: text("mega_chore_id").references((): AnySQLiteColumn => megaChores.id),
    megaChoreGroup: integer("mega_chore_group"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    index("idx_tasks_board").on(t.userId, t.lane, t.position),
    index("idx_tasks_area").on(t.area),
    index("idx_tasks_project").on(t.projectId),
    index("idx_tasks_repeating").on(t.isRepeating, t.lastCompletedAt),
    index("idx_tasks_parent").on(t.parentId, t.position),
    index("idx_tasks_mega_chore").on(t.megaChoreId, t.megaChoreGroup),
  ],
);
```

Add this export at the bottom of the file:

```ts
export type MegaChoreRow = typeof megaChores.$inferSelect;
```

- [ ] **Step 3: Regenerate Drizzle metadata (optional)**

If the project uses `drizzle-kit` for `_journal.json`/`_meta` updates, run the project's standard command (check `package.json` scripts — `pnpm --filter @todoer/server drizzle:generate` is typical). If no such script exists, hand-edit `apps/server/drizzle/meta/_journal.json` to append the new entry mirroring the existing entries, or simply rely on Drizzle's migrator picking up the SQL file by name. Verify by running the typecheck below.

- [ ] **Step 4: Verify migration runs cleanly**

Run: `pnpm --filter @todoer/server test -- --run apps/server/src/services/chore-state.test.ts`
Expected: PASS — the in-memory DB setup runs all migrations including `0002`.

If it fails because the migration journal isn't updated, list the contents of `apps/server/drizzle/meta/` and add a new entry to `_journal.json` for `0002_mega_chores` matching the format of the existing `0001` entry, then re-run.

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @todoer/server tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/server/drizzle/0002_mega_chores.sql apps/server/drizzle/meta apps/server/src/db/schema.ts
git commit -m "feat(db): mega_chores table and tasks columns"
```

---

### Task 3: Board-blocked derivation service

**Files:**
- Create: `apps/server/src/services/board-blocked.ts`
- Create: `apps/server/src/services/board-blocked.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/services/board-blocked.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ChoreWithSteps } from "@todoer/shared";
import { attachMegaChoreState } from "./board-blocked";

interface MegaInput {
  megaChoreId: string | null;
  megaChoreGroup: number | null;
  completedAt: number | null;
}

function mkChore(
  id: string,
  m: MegaInput,
  megaTitlesById: Map<string, string>,
): ChoreWithSteps {
  return {
    id,
    userId: "u",
    projectId: null,
    parentId: null,
    title: id,
    notes: "",
    area: null,
    estimateMinutes: 10,
    lane: m.completedAt === null ? "ready" : "done",
    position: 1,
    isRepeating: false,
    lastCompletedAt: null,
    completedAt: m.completedAt,
    createdAt: 0,
    steps: [],
    // these two are not on the type — passed through attach via the row map
  } as ChoreWithSteps & { _m: MegaInput };
}

describe("attachMegaChoreState", () => {
  it("leaves ordinary (non-mega) chores untouched", () => {
    const out = attachMegaChoreState(
      [{ ...mkChore("c1", { megaChoreId: null, megaChoreGroup: null, completedAt: null }, new Map()) }],
      new Map(),
      new Map(),
    );
    expect(out[0].megaChore).toBeUndefined();
    expect(out[0].isBlocked).toBe(false);
  });

  it("marks group 2 blocked when group 1 has incomplete chores", () => {
    const titles = new Map([["m1", "Clean the garage"]]);
    const chores = [
      { ...mkChore("a", { megaChoreId: "m1", megaChoreGroup: 1, completedAt: null }, titles) },
      { ...mkChore("b", { megaChoreId: "m1", megaChoreGroup: 2, completedAt: null }, titles) },
    ];
    const groupsByMega = new Map<string, number>([["m1", 2]]);
    const out = attachMegaChoreState(chores, titles, groupsByMega, [
      { choreId: "a", megaChoreId: "m1", group: 1, completedAt: null },
      { choreId: "b", megaChoreId: "m1", group: 2, completedAt: null },
    ]);
    expect(out[0].megaChore).toEqual({
      id: "m1",
      title: "Clean the garage",
      group: 1,
      totalGroups: 2,
    });
    expect(out[0].isBlocked).toBe(false);
    expect(out[1].isBlocked).toBe(true);
  });

  it("unblocks group 2 once all group-1 chores are done", () => {
    const titles = new Map([["m1", "Clean the garage"]]);
    const chores = [
      { ...mkChore("a", { megaChoreId: "m1", megaChoreGroup: 1, completedAt: 1 }, titles) },
      { ...mkChore("b", { megaChoreId: "m1", megaChoreGroup: 2, completedAt: null }, titles) },
    ];
    const groupsByMega = new Map<string, number>([["m1", 2]]);
    const out = attachMegaChoreState(chores, titles, groupsByMega, [
      { choreId: "a", megaChoreId: "m1", group: 1, completedAt: 1 },
      { choreId: "b", megaChoreId: "m1", group: 2, completedAt: null },
    ]);
    expect(out[1].isBlocked).toBe(false);
  });

  it("keeps group 3 blocked when group 2 still has work", () => {
    const titles = new Map([["m1", "x"]]);
    const chores = [
      { ...mkChore("a", { megaChoreId: "m1", megaChoreGroup: 1, completedAt: 1 }, titles) },
      { ...mkChore("b", { megaChoreId: "m1", megaChoreGroup: 2, completedAt: null }, titles) },
      { ...mkChore("c", { megaChoreId: "m1", megaChoreGroup: 3, completedAt: null }, titles) },
    ];
    const out = attachMegaChoreState(chores, titles, new Map([["m1", 3]]), [
      { choreId: "a", megaChoreId: "m1", group: 1, completedAt: 1 },
      { choreId: "b", megaChoreId: "m1", group: 2, completedAt: null },
      { choreId: "c", megaChoreId: "m1", group: 3, completedAt: null },
    ]);
    expect(out[0].isBlocked).toBe(false);
    expect(out[1].isBlocked).toBe(false);
    expect(out[2].isBlocked).toBe(true);
  });

  it("unblocks all when every chore is done", () => {
    const titles = new Map([["m1", "x"]]);
    const chores = [
      { ...mkChore("a", { megaChoreId: "m1", megaChoreGroup: 1, completedAt: 1 }, titles) },
      { ...mkChore("b", { megaChoreId: "m1", megaChoreGroup: 2, completedAt: 1 }, titles) },
    ];
    const out = attachMegaChoreState(chores, titles, new Map([["m1", 2]]), [
      { choreId: "a", megaChoreId: "m1", group: 1, completedAt: 1 },
      { choreId: "b", megaChoreId: "m1", group: 2, completedAt: 1 },
    ]);
    expect(out[0].isBlocked).toBe(false);
    expect(out[1].isBlocked).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @todoer/server test -- --run apps/server/src/services/board-blocked.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the derivation service**

Create `apps/server/src/services/board-blocked.ts`:

```ts
import type { ChoreWithSteps, MegaChoreRef } from "@todoer/shared";

interface MegaMembership {
  choreId: string;
  megaChoreId: string;
  group: number;
  completedAt: number | null;
}

/**
 * Attaches `megaChore` and `isBlocked` to each chore in place (returns a new
 * array of new objects). A chore is blocked when its parallel-group index is
 * greater than the highest group whose chores are all `done` ("done" = lane
 * 'done', surfaced here via completedAt being non-null).
 *
 * Pure function so it is trivially unit-testable: the route caller is
 * responsible for assembling `megaTitles`, `totalGroupsByMega`, and the flat
 * `memberships` list from the DB.
 */
export function attachMegaChoreState(
  chores: ChoreWithSteps[],
  megaTitles: Map<string, string>,
  totalGroupsByMega: Map<string, number>,
  memberships: MegaMembership[] = [],
): ChoreWithSteps[] {
  // Per mega-chore, find the highest group such that every chore in groups
  // <= that group has completedAt set. Default 0 if even group 1 has work.
  const unblockedThrough = new Map<string, number>();
  const byMega = new Map<string, MegaMembership[]>();
  for (const m of memberships) {
    const bucket = byMega.get(m.megaChoreId);
    if (bucket) bucket.push(m);
    else byMega.set(m.megaChoreId, [m]);
  }
  for (const [megaId, list] of byMega) {
    const groups = Array.from(new Set(list.map((m) => m.group))).sort(
      (a, b) => a - b,
    );
    let through = 0;
    for (const g of groups) {
      const allDone = list
        .filter((m) => m.group === g)
        .every((m) => m.completedAt !== null);
      if (!allDone) break;
      through = g;
    }
    unblockedThrough.set(megaId, through);
  }

  // Build a per-chore lookup so we can attach without scanning memberships.
  const byChore = new Map<string, MegaMembership>();
  for (const m of memberships) byChore.set(m.choreId, m);

  return chores.map((c) => {
    const m = byChore.get(c.id);
    if (!m) return { ...c, isBlocked: false };
    const totalGroups = totalGroupsByMega.get(m.megaChoreId) ?? 0;
    const title = megaTitles.get(m.megaChoreId) ?? "";
    const ref: MegaChoreRef = {
      id: m.megaChoreId,
      title,
      group: m.group,
      totalGroups,
    };
    const through = unblockedThrough.get(m.megaChoreId) ?? 0;
    return { ...c, megaChore: ref, isBlocked: m.group > through };
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @todoer/server test -- --run apps/server/src/services/board-blocked.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/services/board-blocked.ts apps/server/src/services/board-blocked.test.ts
git commit -m "feat(server): derive mega-chore block state from group completion"
```

---

### Task 4: Board route emits megaChore + isBlocked

**Files:**
- Modify: `apps/server/src/routes/board.ts`

- [ ] **Step 1: Replace the board route handler**

Open `apps/server/src/routes/board.ts`. Replace its full content with:

```ts
import type { FastifyPluginAsync } from "fastify";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type { Board, ChoreWithSteps } from "@todoer/shared";
import { db } from "../db/client";
import { megaChores, tasks } from "../db/schema";
import { attachMegaChoreState } from "../services/board-blocked";

export const boardRoutes: FastifyPluginAsync = async (app) => {
  app.get("/board", async (req) => {
    const choreRows = db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, req.userId), isNull(tasks.parentId)))
      .orderBy(asc(tasks.position))
      .all();

    const stepsByParent = new Map<string, ChoreWithSteps["steps"]>();
    if (choreRows.length > 0) {
      const steps = db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, req.userId),
            inArray(
              tasks.parentId,
              choreRows.map((c) => c.id),
            ),
          ),
        )
        .orderBy(asc(tasks.position))
        .all();
      for (const step of steps) {
        if (step.parentId === null) continue;
        const bucket = stepsByParent.get(step.parentId);
        if (bucket) bucket.push(step);
        else stepsByParent.set(step.parentId, [step]);
      }
    }

    // Collect mega-chore membership and titles for any chores with mega_chore_id.
    const megaIds = Array.from(
      new Set(
        choreRows
          .map((c) => c.megaChoreId)
          .filter((v): v is string => v !== null),
      ),
    );
    const megaTitles = new Map<string, string>();
    const totalGroupsByMega = new Map<string, number>();
    if (megaIds.length > 0) {
      const titleRows = db
        .select()
        .from(megaChores)
        .where(
          and(eq(megaChores.userId, req.userId), inArray(megaChores.id, megaIds)),
        )
        .all();
      for (const m of titleRows) megaTitles.set(m.id, m.title);

      // totalGroups = max group across all chores for each mega.
      for (const c of choreRows) {
        if (c.megaChoreId === null || c.megaChoreGroup === null) continue;
        const cur = totalGroupsByMega.get(c.megaChoreId) ?? 0;
        if (c.megaChoreGroup > cur)
          totalGroupsByMega.set(c.megaChoreId, c.megaChoreGroup);
      }
    }

    const memberships = choreRows
      .filter((c) => c.megaChoreId !== null && c.megaChoreGroup !== null)
      .map((c) => ({
        choreId: c.id,
        megaChoreId: c.megaChoreId as string,
        group: c.megaChoreGroup as number,
        completedAt: c.completedAt,
      }));

    const withSteps: ChoreWithSteps[] = choreRows.map((c) => ({
      ...c,
      steps: stepsByParent.get(c.id) ?? [],
    }));
    const decorated = attachMegaChoreState(
      withSteps,
      megaTitles,
      totalGroupsByMega,
      memberships,
    );

    const board: Board = { ready: [], doing: [], done: [] };
    for (const chore of decorated) board[chore.lane].push(chore);
    return board;
  });
};
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @todoer/server tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Run the existing service tests as a smoke**

Run: `pnpm --filter @todoer/server test -- --run`
Expected: PASS — all existing tests still pass.

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/routes/board.ts
git commit -m "feat(server): expose megaChore and isBlocked on board reads"
```

---

### Task 5: Reject blocked → doing on `/tasks/:id/move`

**Files:**
- Modify: `apps/server/src/routes/tasks.ts`

- [ ] **Step 1: Add the guard in the move handler**

Open `apps/server/src/routes/tasks.ts`. Locate the `/tasks/:id/move` handler. After `const { lane, beforeId, afterId } = parsed.data;` and before the `const position = ...` line, add the check below.

To compute "is blocked," we reuse the derivation service. Add this import at the top of the file:

```ts
import { attachMegaChoreState } from "../services/board-blocked";
import { megaChores } from "../db/schema";
```

Then, just after `const { lane, beforeId, afterId } = parsed.data;`:

```ts
    // Blocked mega-chore chores cannot enter "doing." Detect cheaply by
    // computing membership for this chore's mega-chore (if any) and asking the
    // shared derivation function. This keeps the rule in one place.
    if (lane === "doing" && existing.megaChoreId !== null && existing.megaChoreGroup !== null) {
      const siblings = db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, req.userId),
            eq(tasks.megaChoreId, existing.megaChoreId),
            isNull(tasks.parentId),
          ),
        )
        .all();
      const titleRow = db
        .select()
        .from(megaChores)
        .where(eq(megaChores.id, existing.megaChoreId))
        .get();
      const totalGroups = siblings.reduce(
        (acc, s) => (s.megaChoreGroup && s.megaChoreGroup > acc ? s.megaChoreGroup : acc),
        0,
      );
      const memberships = siblings
        .filter((s) => s.megaChoreGroup !== null)
        .map((s) => ({
          choreId: s.id,
          megaChoreId: s.megaChoreId as string,
          group: s.megaChoreGroup as number,
          completedAt: s.completedAt,
        }));
      const decorated = attachMegaChoreState(
        siblings.map((s) => ({ ...s, steps: [] })),
        new Map([[existing.megaChoreId, titleRow?.title ?? ""]]),
        new Map([[existing.megaChoreId, totalGroups]]),
        memberships,
      );
      const me = decorated.find((d) => d.id === existing.id);
      if (me?.isBlocked) {
        return reply.code(409).send({ error: "blocked_by_mega_chore" });
      }
    }
```

Note: `isNull` is already imported in this file via the existing usage; if not, add `isNull` to the `drizzle-orm` import line at the top.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @todoer/server tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Run all server tests**

Run: `pnpm --filter @todoer/server test -- --run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/routes/tasks.ts
git commit -m "feat(server): reject mega-chore-blocked moves into doing with 409"
```

---

### Task 6: Mega-chore prompts and tool-response parser

**Files:**
- Create: `apps/server/src/services/kits/mega-chore.ts`
- Create: `apps/server/src/services/kits/mega-chore.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/server/src/services/kits/mega-chore.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  MEGA_CHORE_SYSTEM_PROMPT,
  MEGA_CHORE_FORCE_FINALIZE_SUFFIX,
  buildMegaChoreSystemPrompt,
  parseMegaChoreToolResponse,
} from "./mega-chore";

describe("buildMegaChoreSystemPrompt", () => {
  it("returns the base prompt when forceFinalize is false", () => {
    const p = buildMegaChoreSystemPrompt(false);
    expect(p).toContain("turning ONE huge thing");
    expect(p).not.toContain(MEGA_CHORE_FORCE_FINALIZE_SUFFIX);
  });

  it("appends the force-finalize suffix when forceFinalize is true", () => {
    const p = buildMegaChoreSystemPrompt(true);
    expect(p.startsWith(MEGA_CHORE_SYSTEM_PROMPT)).toBe(true);
    expect(p).toContain(MEGA_CHORE_FORCE_FINALIZE_SUFFIX);
  });
});

describe("parseMegaChoreToolResponse", () => {
  it("parses a question response", () => {
    const out = parseMegaChoreToolResponse({
      kind: "question",
      text: "How big is the garage?",
    });
    expect(out).toEqual({
      kind: "question",
      assistantMessage: "How big is the garage?",
    });
  });

  it("parses a breakdown response", () => {
    const out = parseMegaChoreToolResponse({
      kind: "breakdown",
      megaChore: { title: "Clean the garage" },
      area: "Garage",
      chores: [
        {
          title: "clear the floor",
          estimateMinutes: 60,
          group: 1,
          steps: [{ title: "scan", estimateMinutes: 5 }],
        },
        {
          title: "sort the shelves",
          estimateMinutes: 90,
          group: 2,
          steps: [{ title: "pull", estimateMinutes: 10 }],
        },
      ],
    });
    expect(out.kind).toBe("breakdown");
    if (out.kind === "breakdown") {
      expect(out.preview.megaChore.title).toBe("Clean the garage");
      expect(out.preview.chores).toHaveLength(2);
    }
  });

  it("throws on an unknown kind", () => {
    expect(() =>
      parseMegaChoreToolResponse({ kind: "foo" } as unknown),
    ).toThrow();
  });

  it("throws on a breakdown with a group gap", () => {
    expect(() =>
      parseMegaChoreToolResponse({
        kind: "breakdown",
        megaChore: { title: "x" },
        area: "x",
        chores: [
          {
            title: "a",
            estimateMinutes: 10,
            group: 1,
            steps: [{ title: "s", estimateMinutes: 5 }],
          },
          {
            title: "b",
            estimateMinutes: 10,
            group: 3,
            steps: [{ title: "s", estimateMinutes: 5 }],
          },
        ],
      }),
    ).toThrow();
  });

  it("throws on a single-chore breakdown", () => {
    expect(() =>
      parseMegaChoreToolResponse({
        kind: "breakdown",
        megaChore: { title: "x" },
        area: "x",
        chores: [
          {
            title: "a",
            estimateMinutes: 10,
            group: 1,
            steps: [{ title: "s", estimateMinutes: 5 }],
          },
        ],
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @todoer/server test -- --run apps/server/src/services/kits/mega-chore.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the prompt + parser (no Claude call yet)**

Create `apps/server/src/services/kits/mega-chore.ts`:

```ts
import { megaChoreTurnResponseSchema, type MegaChoreTurn } from "@todoer/shared";

export const MEGA_CHORE_SYSTEM_PROMPT = `You are turning ONE huge thing into 2-10 ordered chores for someone with ADHD. The user will describe a task that is too big for a normal AI breakdown — either it's really a project disguised as a chore, or one of its natural steps would itself take hours.

Your job: ask focused clarifying questions, then produce a breakdown.

Rules:
- Prefer FEWER, LARGER chores. Bias toward 3-6 chores with rich step lists over 8+ thin ones. Up to 30 steps per chore is fine if it keeps a coherent unit of work together.
- Each chore must be a coherent unit a human could focus on in one stretch (typically 30-120 minutes total; longer is OK for things like digging).
- Steps within a chore should each take ~5-15 minutes.
- Order the chores into parallel groups via the 'group' field (1-indexed integer). Chores with the same group can be done in any order. A higher group depends on the previous group being fully done (e.g. "lay gravel" group 2 depends on every "dig section" chore in group 1).
- Use phase-based grouping when work has true dependencies. Use zone-based grouping when work is parallelizable across areas. Many mega-chores are a mix.
- Groups must be a consecutive 1..K sequence — never skip a number.
- megaChore.title is a short label ("Clean the garage", "Build the tick moat"). 'area' is the shared area applied to every chore — usually the mega-chore title or close to it.

Tool: ALWAYS respond by calling submit_mega_chore_turn. You may either ask one focused question (kind: "question") or produce the final breakdown (kind: "breakdown"). Ask at most a handful of focused questions before finalizing.`;

export const MEGA_CHORE_FORCE_FINALIZE_SUFFIX = `

The user has indicated they're done answering questions. Produce the breakdown now — do not ask another question.`;

export function buildMegaChoreSystemPrompt(forceFinalize: boolean): string {
  return forceFinalize
    ? `${MEGA_CHORE_SYSTEM_PROMPT}${MEGA_CHORE_FORCE_FINALIZE_SUFFIX}`
    : MEGA_CHORE_SYSTEM_PROMPT;
}

// The forced tool's raw input is shaped as a single object with discriminator
// `kind`. We zod-validate it post-hoc against the shared response schema.
export function parseMegaChoreToolResponse(raw: unknown): MegaChoreTurn {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("mega-chore tool response is not an object");
  }
  const obj = raw as Record<string, unknown>;
  if (obj.kind === "question") {
    return megaChoreTurnResponseSchema.parse({
      kind: "question",
      assistantMessage: obj.text,
    });
  }
  if (obj.kind === "breakdown") {
    return megaChoreTurnResponseSchema.parse({
      kind: "breakdown",
      preview: {
        megaChore: obj.megaChore,
        area: obj.area,
        chores: obj.chores,
      },
    });
  }
  throw new Error("mega-chore tool response has unknown kind");
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @todoer/server test -- --run apps/server/src/services/kits/mega-chore.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/services/kits/mega-chore.ts apps/server/src/services/kits/mega-chore.test.ts
git commit -m "feat(server): mega-chore prompts and tool-response parser"
```

---

### Task 7: Mega-chore Claude call

**Files:**
- Modify: `apps/server/src/services/kits/mega-chore.ts`

- [ ] **Step 1: Append the Claude-call function**

In `apps/server/src/services/kits/mega-chore.ts`, add these imports at the **top of the file** (next to the existing `megaChoreTurnResponseSchema` import):

```ts
import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage } from "@todoer/shared";
```

Then append at the **bottom** of the file:

```ts

const TOOL_INPUT_SCHEMA = {
  type: "object",
  properties: {
    kind: { type: "string", enum: ["question", "breakdown"] },
    text: {
      type: "string",
      description: "When kind=question, the next clarifying question to ask the user.",
    },
    megaChore: {
      type: "object",
      properties: { title: { type: "string" } },
      required: ["title"],
      description: "When kind=breakdown, the mega-chore label.",
    },
    area: {
      type: "string",
      description: "When kind=breakdown, the shared area for all chores.",
    },
    chores: {
      type: "array",
      minItems: 2,
      maxItems: 10,
      description: "When kind=breakdown, the ordered chores.",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          estimateMinutes: { type: "integer", minimum: 1, maximum: 600 },
          group: { type: "integer", minimum: 1, maximum: 20 },
          steps: {
            type: "array",
            minItems: 1,
            maxItems: 30,
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                estimateMinutes: { type: "integer", minimum: 1, maximum: 240 },
                notes: { type: "string" },
              },
              required: ["title", "estimateMinutes"],
            },
          },
        },
        required: ["title", "estimateMinutes", "group", "steps"],
      },
    },
  },
  required: ["kind"],
} as const;

export async function callMegaChoreTurn(
  messages: ChatMessage[],
  forceFinalize: boolean,
): Promise<import("@todoer/shared").MegaChoreTurn> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  const message = await client.messages.create({
    model,
    max_tokens: 3000,
    system: buildMegaChoreSystemPrompt(forceFinalize),
    tools: [
      {
        name: "submit_mega_chore_turn",
        description:
          "Either ask one clarifying question OR produce the full mega-chore breakdown.",
        input_schema: TOOL_INPUT_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "submit_mega_chore_turn" },
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("the model did not return a mega-chore turn");
  }
  return parseMegaChoreToolResponse(toolUse.input);
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @todoer/server tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Run all server tests**

Run: `pnpm --filter @todoer/server test -- --run`
Expected: PASS — Claude is not invoked because no test calls `callMegaChoreTurn`.

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/services/kits/mega-chore.ts
git commit -m "feat(server): call Claude for a mega-chore clarifying turn"
```

---

### Task 8: Accept transaction — persist a mega-chore preview

**Files:**
- Modify: `apps/server/src/services/kits/mega-chore.ts`

- [ ] **Step 1: Append the accept transaction**

In `apps/server/src/services/kits/mega-chore.ts`, add these imports at the **top of the file**:

```ts
import { randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { AcceptMegaChoreBreakdownInput } from "@todoer/shared";
import { db } from "../../db/client";
import { megaChores, projects, tasks } from "../../db/schema";
```

Then append at the **bottom** of the file:

```ts

export interface AcceptMegaChoreResult {
  megaChoreId: string;
  choreIds: string[];
}

/**
 * Inserts one mega-chore row plus N chore rows (each with a project + steps).
 * All chores share `area`, land in `ready`, and reference the new mega-chore.
 * Wrapped in a single transaction — any insert error rolls everything back.
 */
export function acceptMegaChoreBreakdown(
  userId: string,
  input: AcceptMegaChoreBreakdownInput,
): AcceptMegaChoreResult {
  const now = Date.now();
  const megaChoreId = randomUUID();

  return db.transaction((tx) => {
    tx.insert(megaChores)
      .values({
        id: megaChoreId,
        userId,
        title: input.megaChore.title,
        createdAt: now,
      })
      .run();

    // Find current end position in 'ready' for this user — every new chore
    // appends and increments.
    const last = tx
      .select({ position: tasks.position })
      .from(tasks)
      .where(
        and(eq(tasks.userId, userId), eq(tasks.lane, "ready"), isNull(tasks.parentId)),
      )
      .orderBy(sql`${tasks.position} desc`)
      .limit(1)
      .get();
    let position = last !== undefined ? last.position + 1 : 1;
    const choreIds: string[] = [];

    for (const chore of input.chores) {
      const projectId = randomUUID();
      const choreId = randomUUID();
      tx.insert(projects)
        .values({ id: projectId, userId, title: chore.title, createdAt: now })
        .run();

      tx.insert(tasks)
        .values({
          id: choreId,
          userId,
          projectId,
          parentId: null,
          title: chore.title,
          notes: "",
          area: input.area,
          estimateMinutes: chore.estimateMinutes,
          lane: "ready",
          position,
          isRepeating: false,
          lastCompletedAt: null,
          completedAt: null,
          megaChoreId,
          megaChoreGroup: chore.group,
          createdAt: now,
        })
        .run();
      choreIds.push(choreId);
      position += 1;

      let stepPosition = 1;
      for (const step of chore.steps) {
        tx.insert(tasks)
          .values({
            id: randomUUID(),
            userId,
            projectId: null,
            parentId: choreId,
            title: step.title,
            notes: step.notes ?? "",
            area: null,
            estimateMinutes: step.estimateMinutes,
            lane: "ready",
            position: stepPosition,
            isRepeating: false,
            lastCompletedAt: null,
            completedAt: null,
            megaChoreId: null,
            megaChoreGroup: null,
            createdAt: now,
          })
          .run();
        stepPosition += 1;
      }
    }

    return { megaChoreId, choreIds };
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @todoer/server tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Sanity-run all server tests**

Run: `pnpm --filter @todoer/server test -- --run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/services/kits/mega-chore.ts
git commit -m "feat(server): mega-chore accept transaction"
```

---

### Task 9: Routes — `/kits/mega-chore/turn` and `/accept`

**Files:**
- Modify: `apps/server/src/routes/kits.ts`

- [ ] **Step 1: Replace the file contents**

Replace `apps/server/src/routes/kits.ts` with:

```ts
import type { FastifyPluginAsync } from "fastify";
import {
  acceptMegaChoreBreakdownSchema,
  megaChoreTurnRequestSchema,
  packingFormSchema,
} from "@todoer/shared";
import {
  acceptMegaChoreBreakdown,
  callMegaChoreTurn,
} from "../services/kits/mega-chore";
import { generatePackingList } from "../services/kits/packing";

export const kitsRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/kits/packing/generate",
    { config: { rateLimit: { max: 30, timeWindow: "1 hour" } } },
    async (req, reply) => {
      const parsed = packingFormSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: "invalid_input", issues: parsed.error.issues });
      }
      try {
        const preview = await generatePackingList(parsed.data);
        return preview;
      } catch (err) {
        req.log.error({ err }, "packing kit generate failed");
        return reply.code(503).send({ error: "kit_unavailable" });
      }
    },
  );

  app.post(
    "/kits/mega-chore/turn",
    { config: { rateLimit: { max: 30, timeWindow: "1 hour" } } },
    async (req, reply) => {
      const parsed = megaChoreTurnRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: "invalid_input", issues: parsed.error.issues });
      }
      try {
        const turn = await callMegaChoreTurn(
          parsed.data.messages,
          parsed.data.forceFinalize ?? false,
        );
        return turn;
      } catch (err) {
        req.log.error({ err }, "mega-chore kit turn failed");
        return reply.code(503).send({ error: "kit_unavailable" });
      }
    },
  );

  app.post("/kits/mega-chore/accept", async (req, reply) => {
    const parsed = acceptMegaChoreBreakdownSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "invalid_input", issues: parsed.error.issues });
    }
    const result = acceptMegaChoreBreakdown(req.userId, parsed.data);
    return reply.code(201).send(result);
  });
};
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @todoer/server tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Run all server tests**

Run: `pnpm --filter @todoer/server test -- --run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/routes/kits.ts
git commit -m "feat(server): /kits/mega-chore/turn and /accept routes"
```

---

### Task 10: Breakdown system prompt mentions the mega-chore kit

**Files:**
- Modify: `apps/server/src/services/breakdown.ts`

- [ ] **Step 1: Update the kit list in the system prompt**

Open `apps/server/src/services/breakdown.ts`. Locate the block starting `There are specialized chore generators ("chore kits") that handle some task types better...` and replace through `(currently only "packing")` with:

```text
There are specialized chore generators ("chore kits") that handle some task types better than this open-ended breakdown:
- "packing" — packing for a trip (destination, nights, who's going, etc.).
- "mega-chore" — one huge thing that's really a project (e.g. "clean the garage", "build a tick moat", "redo the closet") — too big for steps under 10 minutes each, or where one natural step would itself take hours.

If the input clearly describes a kit-supported task, set isActionable to false, put a short clarification like "this sounds like packing for a trip — try the packing kit" or "this is a mega chore — try the mega chore kit", and set suggestedKitKind to the matching kit id ("packing" or "mega-chore"). Do NOT set suggestedKitKind unless the input matches a supported kit.
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @todoer/server tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Run all server tests**

Run: `pnpm --filter @todoer/server test -- --run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/services/breakdown.ts
git commit -m "feat(server): suggest the mega-chore kit from /breakdown"
```

---

### Task 11: Shared API client functions

**Files:**
- Modify: `packages/shared/src/api.ts`

- [ ] **Step 1: Append the two new client functions**

Append to `packages/shared/src/api.ts`:

```ts
export function postMegaChoreTurn(
  input: import("./schemas").MegaChoreTurnRequest,
): Promise<import("./types").MegaChoreTurn> {
  return request<import("./types").MegaChoreTurn>("/kits/mega-chore/turn", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function acceptMegaChoreBreakdown(
  input: import("./schemas").AcceptMegaChoreBreakdownInput,
): Promise<{ megaChoreId: string; choreIds: string[] }> {
  return request<{ megaChoreId: string; choreIds: string[] }>(
    "/kits/mega-chore/accept",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}
```

- [ ] **Step 2: Verify the shared package exports new symbols**

Open `packages/shared/src/index.ts`. If it uses explicit re-exports (e.g. `export * from "./types"`), this is fine because the new symbols live in already-re-exported files. Otherwise add `export * from "./api";` if it isn't already there. Check it:

Run: `grep -n "api" packages/shared/src/index.ts`
Expected: shows an existing re-export of `./api`. If not present, append:

```ts
export * from "./api";
```

- [ ] **Step 3: Typecheck**

Run: `pnpm -r typecheck` (or run `tsc --noEmit` in `packages/shared`, `apps/server`, `apps/phone` in sequence).
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/api.ts packages/shared/src/index.ts
git commit -m "feat(shared): api client for mega-chore turn and accept"
```

---

### Task 12: Phone — enable mega-chore in the registry

**Files:**
- Modify: `apps/phone/src/kits/registry.ts`
- Modify: `apps/phone/src/kits/registry.test.ts`

- [ ] **Step 1: Flip the registry**

In `apps/phone/src/kits/registry.ts`, change the `mega-chore` entry's `enabled` from `false` to `true`:

```ts
  {
    id: "mega-chore",
    title: "mega chore",
    blurb: "one huge thing → several chores, each with steps.",
    icon: "MC",
    enabled: true,
  },
```

- [ ] **Step 2: Update the registry test**

Open `apps/phone/src/kits/registry.test.ts`. Replace any assertion that says `mega-chore.enabled === false` with `=== true`. If the test only checks `enabled === true` for `packing`, add an explicit case:

```ts
it("has mega-chore enabled", () => {
  const m = KITS.find((k) => k.id === "mega-chore");
  expect(m?.enabled).toBe(true);
});
```

- [ ] **Step 3: Run the phone tests**

Run: `pnpm --filter @todoer/phone test -- --run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/phone/src/kits/registry.ts apps/phone/src/kits/registry.test.ts
git commit -m "feat(phone): enable mega-chore kit in registry"
```

---

### Task 13: Phone — tanstack hooks for the kit

**Files:**
- Create: `apps/phone/src/kits/mega-chore/use-mega-chore-turn.ts`
- Create: `apps/phone/src/kits/mega-chore/use-mega-chore-accept.ts`

- [ ] **Step 1: Create the turn hook**

Create `apps/phone/src/kits/mega-chore/use-mega-chore-turn.ts`:

```ts
import { useMutation } from "@tanstack/react-query";
import { postMegaChoreTurn } from "@todoer/shared";

export function useMegaChoreTurn() {
  return useMutation({ mutationFn: postMegaChoreTurn });
}
```

- [ ] **Step 2: Create the accept hook**

Create `apps/phone/src/kits/mega-chore/use-mega-chore-accept.ts`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { acceptMegaChoreBreakdown } from "@todoer/shared";

export function useMegaChoreAccept() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: acceptMegaChoreBreakdown,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["board"] });
      qc.invalidateQueries({ queryKey: ["areas"] });
    },
  });
}
```

(If the project's existing tanstack patterns use different query keys, mirror those. Inspect `apps/phone/src/lib/api-hooks.ts` for the exact `useBoard`/`useAreas` keys and substitute if necessary.)

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @todoer/phone tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/phone/src/kits/mega-chore
git commit -m "feat(phone): tanstack hooks for mega-chore kit"
```

---

### Task 14: Phone — MegaChoreKitScreen (initial input state)

**Files:**
- Create: `apps/phone/src/kits/mega-chore/MegaChoreKitScreen.tsx`
- Modify: `apps/phone/src/App.tsx`

- [ ] **Step 1: Stub the screen with just the initial state**

Create `apps/phone/src/kits/mega-chore/MegaChoreKitScreen.tsx`:

```tsx
import { useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router";
import {
  ApiError,
  type ChatMessage,
  type MegaChoreBreakdownPreview,
} from "@todoer/shared";
import { Sticker } from "../../components/Chrome";
import {
  bg,
  blue,
  display,
  ink,
  inkDim,
  mono,
  pink,
  yellow,
} from "../../theme";
import { useMegaChoreTurn } from "./use-mega-chore-turn";

type ScreenState =
  | { kind: "initial"; text: string }
  | {
      kind: "chat";
      messages: ChatMessage[];
      draft: string;
      error: string | null;
    }
  | { kind: "review"; preview: MegaChoreBreakdownPreview };

export function MegaChoreKitScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const turn = useMegaChoreTurn();

  const prefill =
    typeof (location.state as { prefillText?: unknown } | null)?.prefillText ===
    "string"
      ? ((location.state as { prefillText: string }).prefillText)
      : "";

  const [state, setState] = useState<ScreenState>({
    kind: "initial",
    text: prefill,
  });
  const [topError, setTopError] = useState<string | null>(null);

  function startChat() {
    if (state.kind !== "initial") return;
    const trimmed = state.text.trim();
    if (trimmed.length === 0) return;
    setTopError(null);
    const messages: ChatMessage[] = [{ role: "user", content: trimmed }];
    turn.mutate(
      { messages },
      {
        onSuccess: (resp) => {
          if (resp.kind === "question") {
            setState({
              kind: "chat",
              messages: [
                ...messages,
                { role: "assistant", content: resp.assistantMessage },
              ],
              draft: "",
              error: null,
            });
          } else {
            setState({ kind: "review", preview: resp.preview });
          }
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 429) {
            setTopError("hit the mega chore kit rate limit — try again in a bit.");
          } else {
            setTopError("couldn't reach the ai — try again.");
          }
        },
      },
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <Box sx={{ bgcolor: ink, color: bg }}>
        <Toolbar sx={{ minHeight: 56, px: 1 }}>
          <IconButton
            edge="start"
            onClick={() => navigate("/add/kit")}
            aria-label="Back"
            sx={{ color: bg, "&:hover": { color: pink } }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography
            sx={{
              fontFamily: display,
              fontWeight: 900,
              fontSize: 22,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            mega_chore_kit
            <Box component="span" sx={{ color: pink }}>.</Box>
          </Typography>
        </Toolbar>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
        {state.kind === "initial" && (
          <Box
            sx={{
              p: 3,
              display: "flex",
              flexDirection: "column",
              gap: 2.5,
              maxWidth: 540,
              mx: "auto",
            }}
          >
            <Box>
              <Sticker color="pink" rotate={-2}>
                describe it
              </Sticker>
              <Typography
                sx={{
                  fontFamily: display,
                  fontWeight: 900,
                  fontSize: 38,
                  lineHeight: 0.95,
                  textTransform: "uppercase",
                  letterSpacing: "-0.01em",
                  mt: 1.5,
                  textShadow: `2px 2px 0 ${pink}, -2px -2px 0 ${blue}`,
                }}
              >
                what's the{" "}
                <Box component="span" sx={{ color: pink }}>
                  huge thing?
                </Box>
              </Typography>
              <Typography
                sx={{
                  fontFamily: mono,
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: inkDim,
                  mt: 1.5,
                  letterSpacing: "0.04em",
                }}
              >
                claude will ask a few quick questions, then split it into chores you can do in order. (chat does not save if you leave.)
              </Typography>
            </Box>

            <TextField
              label="the mega chore"
              value={state.text}
              onChange={(e) => setState({ kind: "initial", text: e.target.value })}
              multiline
              minRows={3}
              fullWidth
              autoFocus
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />

            <Button
              variant="contained"
              size="large"
              startIcon={
                turn.isPending ? (
                  <CircularProgress size={18} sx={{ color: yellow }} />
                ) : undefined
              }
              onClick={startChat}
              disabled={turn.isPending || state.text.trim().length === 0}
              sx={{ py: 2.25, fontSize: 18, justifyContent: "space-between" }}
            >
              <Box component="span">
                {turn.isPending ? "thinking…" : "start"}
              </Box>
              {!turn.isPending && (
                <Box
                  component="span"
                  sx={{
                    fontFamily: display,
                    fontWeight: 900,
                    fontSize: 24,
                    color: yellow,
                  }}
                >
                  →
                </Box>
              )}
            </Button>

            {topError && <Alert severity="warning">{topError}</Alert>}
          </Box>
        )}
        {state.kind === "chat" && (
          <Box sx={{ p: 3, color: inkDim }}>
            <Typography>chat state — TBD next task</Typography>
            <Stack sx={{ mt: 2 }} spacing={1}>
              {state.messages.map((m, i) => (
                <Box key={i} sx={{ fontFamily: mono, fontSize: 12 }}>
                  <b>{m.role}:</b> {m.content}
                </Box>
              ))}
            </Stack>
          </Box>
        )}
        {state.kind === "review" && (
          <Box sx={{ p: 3, color: inkDim }}>
            <Typography>review state — TBD next task</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
```

Note: the `"chat"` and `"review"` branches render placeholder text intentionally — they're implemented in the next two tasks. This task ships a working initial-input state that performs the first turn.

- [ ] **Step 2: Add the route**

In `apps/phone/src/App.tsx`, add the import and the route:

```tsx
import { MegaChoreKitScreen } from "./kits/mega-chore/MegaChoreKitScreen";
```

And add the new `<Route>` line next to the existing kit route:

```tsx
        <Route path="/add/kit/mega-chore" element={<MegaChoreKitScreen />} />
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @todoer/phone tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Manual sanity (optional)**

Run the dev server (`pnpm --filter @todoer/phone dev`), navigate to `/add/kit`, tap "mega chore", confirm you land on the screen and can type into the textarea.

- [ ] **Step 5: Commit**

```bash
git add apps/phone/src/kits/mega-chore/MegaChoreKitScreen.tsx apps/phone/src/App.tsx
git commit -m "feat(phone): MegaChoreKitScreen initial input state and route"
```

---

### Task 15: Phone — MegaChoreKitScreen chat state

**Files:**
- Modify: `apps/phone/src/kits/mega-chore/MegaChoreKitScreen.tsx`

- [ ] **Step 1: Implement the chat branch**

In `apps/phone/src/kits/mega-chore/MegaChoreKitScreen.tsx`, replace the placeholder `state.kind === "chat"` block with a real thread. Add a helper inside the component above the JSX:

```tsx
  function sendTurn(forceFinalize: boolean) {
    if (state.kind !== "chat") return;
    if (!forceFinalize && state.draft.trim().length === 0) return;
    const userMessages = forceFinalize
      ? state.messages
      : [...state.messages, { role: "user", content: state.draft.trim() } as ChatMessage];

    // Optimistically show the user's message immediately.
    if (!forceFinalize) {
      setState({ ...state, messages: userMessages, draft: "", error: null });
    } else {
      setState({ ...state, error: null });
    }
    turn.mutate(
      { messages: userMessages, forceFinalize },
      {
        onSuccess: (resp) => {
          if (resp.kind === "question") {
            setState({
              kind: "chat",
              messages: [
                ...userMessages,
                { role: "assistant", content: resp.assistantMessage },
              ],
              draft: "",
              error: null,
            });
          } else {
            setState({ kind: "review", preview: resp.preview });
          }
        },
        onError: (err) => {
          const msg =
            err instanceof ApiError && err.status === 429
              ? "hit the mega chore kit rate limit — try again in a bit."
              : "couldn't reach the ai — try again.";
          setState((prev) =>
            prev.kind === "chat" ? { ...prev, error: msg } : prev,
          );
        },
      },
    );
  }
```

Then replace the `state.kind === "chat"` JSX block with:

```tsx
        {state.kind === "chat" && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              maxWidth: 540,
              mx: "auto",
              width: "100%",
            }}
          >
            <Box
              sx={{
                position: "sticky",
                top: 0,
                bgcolor: bg,
                borderBottom: `2px solid ${ink}`,
                px: 2,
                py: 1.25,
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <Button
                variant="outlined"
                size="small"
                disabled={turn.isPending}
                onClick={() => sendTurn(true)}
                sx={{ fontFamily: mono, fontSize: 12 }}
              >
                just give me the breakdown
              </Button>
            </Box>

            <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
              <Stack spacing={1.5}>
                {state.messages.map((m, i) => (
                  <Box
                    key={i}
                    sx={{
                      alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                      bgcolor: m.role === "user" ? ink : pink,
                      color: m.role === "user" ? bg : ink,
                      border: `2px solid ${ink}`,
                      px: 1.5,
                      py: 1,
                      maxWidth: "80%",
                      fontFamily: mono,
                      fontSize: 13,
                      lineHeight: 1.4,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {m.content}
                  </Box>
                ))}
                {turn.isPending && (
                  <Box sx={{ alignSelf: "flex-start", color: inkDim, fontFamily: mono, fontSize: 12 }}>
                    thinking…
                  </Box>
                )}
              </Stack>
            </Box>

            <Box sx={{ p: 2, borderTop: `2px solid ${ink}`, bgcolor: bg }}>
              {state.error && (
                <Alert severity="warning" sx={{ mb: 1 }}>{state.error}</Alert>
              )}
              <Stack direction="row" spacing={1}>
                <TextField
                  value={state.draft}
                  onChange={(e) =>
                    setState({ ...state, draft: e.target.value })
                  }
                  placeholder="reply…"
                  multiline
                  maxRows={4}
                  fullWidth
                  disabled={turn.isPending}
                />
                <Button
                  variant="contained"
                  disabled={turn.isPending || state.draft.trim().length === 0}
                  onClick={() => sendTurn(false)}
                >
                  send
                </Button>
              </Stack>
            </Box>
          </Box>
        )}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @todoer/phone tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Manual sanity (optional)**

With the dev server running, walk through: initial input → send → wait → reply → repeat → tap "just give me the breakdown". The screen should transition to `state.kind === "review"` (placeholder) on a breakdown response. Don't worry that review is still a placeholder — that's the next task.

- [ ] **Step 4: Commit**

```bash
git add apps/phone/src/kits/mega-chore/MegaChoreKitScreen.tsx
git commit -m "feat(phone): mega-chore clarifying chat thread"
```

---

### Task 16: Phone — `MultiChoreBreakdownReview` component

**Files:**
- Create: `apps/phone/src/components/MultiChoreBreakdownReview.tsx`
- Modify: `apps/phone/src/kits/mega-chore/MegaChoreKitScreen.tsx`

- [ ] **Step 1: Create the review component**

Create `apps/phone/src/components/MultiChoreBreakdownReview.tsx`:

```tsx
import { useState } from "react";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type {
  AcceptMegaChoreBreakdownInput,
  MegaChoreBreakdownPreview,
} from "@todoer/shared";
import {
  bg,
  bgCard,
  blue,
  display,
  ink,
  inkDim,
  mono,
  pink,
  yellow,
} from "../theme";

interface EditableStep {
  key: string;
  title: string;
  estimate: string;
  notes: string;
}

interface EditableChore {
  key: string;
  title: string;
  estimate: string;
  group: number;
  steps: EditableStep[];
  expanded: boolean;
}

interface MultiChoreBreakdownReviewProps {
  preview: MegaChoreBreakdownPreview;
  areas: string[];
  accepting: boolean;
  error: boolean;
  onAccept: (input: AcceptMegaChoreBreakdownInput) => void;
  onStartOver: () => void;
}

let keyCounter = 0;
const nextKey = (p: string) => `${p}-${keyCounter++}`;

export function MultiChoreBreakdownReview({
  preview,
  areas,
  accepting,
  error,
  onAccept,
  onStartOver,
}: MultiChoreBreakdownReviewProps) {
  const [megaTitle, setMegaTitle] = useState(preview.megaChore.title);
  const [area, setArea] = useState(preview.area);
  const [chores, setChores] = useState<EditableChore[]>(() =>
    preview.chores.map((c) => ({
      key: nextKey("chore"),
      title: c.title,
      estimate: String(c.estimateMinutes),
      group: c.group,
      expanded: c.group === 1,
      steps: c.steps.map((s) => ({
        key: nextKey("step"),
        title: s.title,
        estimate: String(s.estimateMinutes),
        notes: s.notes ?? "",
      })),
    })),
  );

  const sortedChores = [...chores].sort((a, b) => a.group - b.group);
  const groupValues = Array.from(new Set(sortedChores.map((c) => c.group))).sort(
    (a, b) => a - b,
  );

  // Group sequence must be consecutive 1..K. Compute K from current values.
  function nextK(): number {
    return groupValues.length;
  }

  function canBumpDown(group: number): boolean {
    // Can move into the next group if it already exists, or if appending K+1
    // wouldn't leave a gap (only allowed when there are still chores left
    // behind in the current group).
    const next = group + 1;
    if (groupValues.includes(next)) return true;
    if (next === nextK() + 1) {
      const inCurrent = sortedChores.filter((c) => c.group === group).length;
      return inCurrent > 1;
    }
    return false;
  }

  function canBumpUp(group: number): boolean {
    return group > 1;
  }

  function bump(key: string, delta: number) {
    setChores((current) => {
      const target = current.find((c) => c.key === key);
      if (!target) return current;
      const newGroup = target.group + delta;
      if (newGroup < 1) return current;
      const updated = current.map((c) =>
        c.key === key ? { ...c, group: newGroup } : c,
      );
      // Compact group sequence so it stays 1..K with no gaps.
      const used = Array.from(new Set(updated.map((c) => c.group))).sort(
        (a, b) => a - b,
      );
      const remap = new Map<number, number>();
      used.forEach((g, i) => remap.set(g, i + 1));
      return updated.map((c) => ({ ...c, group: remap.get(c.group) ?? c.group }));
    });
  }

  function updateChore<K extends keyof EditableChore>(
    key: string,
    field: K,
    value: EditableChore[K],
  ) {
    setChores((cs) =>
      cs.map((c) => (c.key === key ? { ...c, [field]: value } : c)),
    );
  }

  function updateStep<K extends keyof EditableStep>(
    choreKey: string,
    stepKey: string,
    field: K,
    value: EditableStep[K],
  ) {
    setChores((cs) =>
      cs.map((c) =>
        c.key === choreKey
          ? {
              ...c,
              steps: c.steps.map((s) =>
                s.key === stepKey ? { ...s, [field]: value } : s,
              ),
            }
          : c,
      ),
    );
  }

  function isFormValid(): boolean {
    if (megaTitle.trim().length === 0) return false;
    if (area.trim().length === 0) return false;
    if (chores.length < 2 || chores.length > 10) return false;
    for (const c of chores) {
      if (c.title.trim().length === 0) return false;
      if (!Number.isFinite(Number(c.estimate))) return false;
      if (c.steps.length < 1 || c.steps.length > 30) return false;
      for (const s of c.steps) {
        if (s.title.trim().length === 0) return false;
        if (!Number.isFinite(Number(s.estimate))) return false;
      }
    }
    return true;
  }

  function submit() {
    if (!isFormValid()) return;
    const payload: AcceptMegaChoreBreakdownInput = {
      megaChore: { title: megaTitle.trim() },
      area: area.trim(),
      chores: sortedChores.map((c) => ({
        title: c.title.trim(),
        estimateMinutes: Math.max(1, Math.round(Number(c.estimate))),
        group: c.group,
        steps: c.steps.map((s) => ({
          title: s.title.trim(),
          estimateMinutes: Math.max(1, Math.round(Number(s.estimate))),
          notes: s.notes.trim() ? s.notes.trim() : undefined,
        })),
      })),
    };
    onAccept(payload);
  }

  return (
    <Box sx={{ p: 2, maxWidth: 640, mx: "auto" }}>
      <Typography
        sx={{
          fontFamily: display,
          fontWeight: 900,
          fontSize: 28,
          textTransform: "uppercase",
          letterSpacing: "-0.01em",
          mb: 2,
        }}
      >
        review the mega chore
      </Typography>

      <Stack spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="mega chore"
          value={megaTitle}
          onChange={(e) => setMegaTitle(e.target.value)}
          fullWidth
        />
        <Autocomplete
          freeSolo
          options={areas}
          value={area}
          onInputChange={(_e, v) => setArea(v ?? "")}
          renderInput={(params) => <TextField {...params} label="area" />}
        />
      </Stack>

      {groupValues.map((g) => (
        <Box key={`g-${g}`} sx={{ mb: 2 }}>
          <Typography
            sx={{
              fontFamily: mono,
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: inkDim,
              borderBottom: `1px solid ${ink}`,
              pb: 0.5,
              mb: 1,
            }}
          >
            group {g}
          </Typography>
          <Stack spacing={1.25}>
            {sortedChores
              .filter((c) => c.group === g)
              .map((c) => (
                <Box
                  key={c.key}
                  sx={{
                    border: `2px solid ${ink}`,
                    bgcolor: bgCard,
                    p: 1.5,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      value={c.title}
                      onChange={(e) => updateChore(c.key, "title", e.target.value)}
                      placeholder="chore title"
                      fullWidth
                      size="small"
                    />
                    <TextField
                      value={c.estimate}
                      onChange={(e) =>
                        updateChore(c.key, "estimate", e.target.value)
                      }
                      placeholder="min"
                      size="small"
                      sx={{ width: 80 }}
                      slotProps={{ htmlInput: { inputMode: "numeric" } }}
                    />
                    <IconButton
                      size="small"
                      disabled={!canBumpUp(c.group)}
                      onClick={() => bump(c.key, -1)}
                      aria-label="bump group up"
                    >
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      disabled={!canBumpDown(c.group)}
                      onClick={() => bump(c.key, +1)}
                      aria-label="bump group down"
                    >
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => updateChore(c.key, "expanded", !c.expanded)}
                      aria-label="toggle steps"
                    >
                      {c.expanded ? (
                        <ExpandLessIcon fontSize="small" />
                      ) : (
                        <ExpandMoreIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Stack>

                  {!c.expanded && (
                    <Typography
                      sx={{
                        fontFamily: mono,
                        fontSize: 11,
                        color: inkDim,
                        mt: 0.5,
                      }}
                    >
                      {c.steps.length} step{c.steps.length === 1 ? "" : "s"}
                    </Typography>
                  )}

                  {c.expanded && (
                    <Stack spacing={0.75} sx={{ mt: 1.25 }}>
                      {c.steps.map((s) => (
                        <Stack
                          key={s.key}
                          direction="row"
                          spacing={1}
                          alignItems="flex-start"
                        >
                          <TextField
                            value={s.title}
                            onChange={(e) =>
                              updateStep(c.key, s.key, "title", e.target.value)
                            }
                            placeholder="step"
                            fullWidth
                            size="small"
                          />
                          <TextField
                            value={s.estimate}
                            onChange={(e) =>
                              updateStep(c.key, s.key, "estimate", e.target.value)
                            }
                            size="small"
                            sx={{ width: 80 }}
                            slotProps={{ htmlInput: { inputMode: "numeric" } }}
                          />
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Box>
              ))}
          </Stack>
        </Box>
      ))}

      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button variant="outlined" onClick={onStartOver}>
          start over
        </Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={!isFormValid() || accepting}
          sx={{ flexGrow: 1 }}
        >
          {accepting ? "making it…" : `make it · ${chores.length} chores`}
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          couldn't save — try again.
        </Alert>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Wire the review into MegaChoreKitScreen**

In `apps/phone/src/kits/mega-chore/MegaChoreKitScreen.tsx`:

Add these imports:

```tsx
import { useAreas } from "../../lib/api-hooks";
import { MultiChoreBreakdownReview } from "../../components/MultiChoreBreakdownReview";
import { useMegaChoreAccept } from "./use-mega-chore-accept";
```

Inside the component, near the top:

```tsx
  const areas = useAreas();
  const accept = useMegaChoreAccept();
```

Replace the placeholder `state.kind === "review"` block with:

```tsx
        {state.kind === "review" && (
          <MultiChoreBreakdownReview
            preview={state.preview}
            areas={areas.data ?? []}
            accepting={accept.isPending}
            error={accept.isError}
            onAccept={(input) =>
              accept.mutate(input, { onSuccess: () => navigate("/board") })
            }
            onStartOver={() => setState({ kind: "initial", text: prefill })}
          />
        )}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @todoer/phone tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/phone/src/components/MultiChoreBreakdownReview.tsx apps/phone/src/kits/mega-chore/MegaChoreKitScreen.tsx
git commit -m "feat(phone): multi-chore breakdown review and kit wiring"
```

---

### Task 17: Phone — Lane.tsx blocked divider

**Files:**
- Modify: `apps/phone/src/components/Lane.tsx`

- [ ] **Step 1: Split rendering on `isBlocked`**

In `apps/phone/src/components/Lane.tsx`, replace the children of the `SortableContext`'s `<Stack spacing={1.5}>` block with:

```tsx
            {(() => {
              // Only the Ready lane shows a blocked-divider. Other lanes never
              // contain blocked chores (doing/done are user-driven moves).
              const unblocked =
                laneId === "ready"
                  ? chores.filter((c) => !c.isBlocked)
                  : chores;
              const blocked =
                laneId === "ready"
                  ? chores.filter((c) => c.isBlocked)
                  : [];
              return (
                <>
                  {unblocked.map((chore) => (
                    <SortableTaskCard
                      key={chore.id}
                      chore={chore}
                      lane={laneId}
                      onClick={() => onChoreClick(chore)}
                    />
                  ))}
                  {blocked.length > 0 && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        my: 0.5,
                      }}
                    >
                      <Box
                        sx={{
                          flexGrow: 1,
                          borderBottom: `2px dashed ${ink}`,
                          opacity: 0.4,
                        }}
                      />
                      <Typography
                        sx={{
                          fontFamily: mono,
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: "0.12em",
                          color: inkDim,
                        }}
                      >
                        blocked
                      </Typography>
                      <Box
                        sx={{
                          flexGrow: 1,
                          borderBottom: `2px dashed ${ink}`,
                          opacity: 0.4,
                        }}
                      />
                    </Box>
                  )}
                  {blocked.map((chore) => (
                    <SortableTaskCard
                      key={chore.id}
                      chore={chore}
                      lane={laneId}
                      onClick={() => onChoreClick(chore)}
                    />
                  ))}
                  {chores.length === 0 && (
                    <Box
                      sx={{
                        py: 5,
                        textAlign: "center",
                        border: `2px dashed ${ink}`,
                        opacity: 0.45,
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: display,
                          fontWeight: 700,
                          fontSize: 16,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color: inkDim,
                        }}
                      >
                        empty
                      </Typography>
                    </Box>
                  )}
                </>
              );
            })()}
```

Make sure `inkDim` is already imported at the top — it is per the existing file. No other imports needed.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @todoer/phone tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/phone/src/components/Lane.tsx
git commit -m "feat(phone): blocked divider inside Ready lane"
```

---

### Task 18: Phone — TaskCard chip and muted styling when blocked

**Files:**
- Modify: `apps/phone/src/components/TaskCard.tsx`
- Modify: `apps/phone/src/components/SortableTaskCard.tsx`

- [ ] **Step 1: Disable dragging when blocked**

Open `apps/phone/src/components/SortableTaskCard.tsx`. Find the `useSortable` hook call. Pass `disabled` when the chore is blocked. The expected pattern looks like:

```tsx
const sortable = useSortable({
  id: chore.id,
  disabled: chore.isBlocked === true,
});
```

If `useSortable` is called without a config object that supports `disabled`, look at the existing call signature and add `disabled: chore.isBlocked === true` to the options object. (If the existing options object doesn't exist, create one.)

- [ ] **Step 2: Render the chip + muted styling + hidden steps**

Open `apps/phone/src/components/TaskCard.tsx`. Locate the `return <Card …>` block. Inside the `Card`'s `sx`, add:

```tsx
        opacity: isDone ? 0.7 : chore.isBlocked ? 0.55 : 1,
```

(replace the existing `opacity: isDone ? 0.7 : 1` line).

Just inside the top of `<CardContent>` (or wherever the chore title currently renders), add the mega-chore chip — but only when `chore.megaChore` is set:

```tsx
{chore.megaChore && (
  <Typography
    sx={{
      fontFamily: mono,
      fontSize: 10,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      color: inkDim,
      mb: 0.5,
    }}
  >
    {chore.megaChore.title} · g{chore.megaChore.group}/{chore.megaChore.totalGroups}
  </Typography>
)}
```

Locate the section of `TaskCard.tsx` that renders the chore's steps (currently rendered when `steps.length > 0`). Wrap that section in a condition so it does NOT render when `chore.isBlocked === true`:

```tsx
{!chore.isBlocked && steps.length > 0 && (
  /* existing steps block here */
)}
```

If a blocked chore has steps that should be replaced with a one-line summary, add (where the steps block was):

```tsx
{chore.isBlocked && chore.megaChore && (
  <Typography
    sx={{
      fontFamily: mono,
      fontSize: 11,
      fontStyle: "italic",
      color: inkDim,
      mt: 1,
    }}
  >
    blocked — finish group {chore.megaChore.group - 1} first.
  </Typography>
)}
```

Finally, gate the focus-start affordance so blocked cards don't show it. Find the `showStart` line near the top of the component and change to:

```tsx
const showStart = !flat && !isDone && !chore.isBlocked && hasFocusableWork(chore);
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @todoer/phone tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Manual sanity (optional)**

If you have a way to seed a mega-chore (run the kit end-to-end), confirm: chip renders, group-1 cards look normal, group-2 cards are muted and don't show their step list, the "blocked — finish group 1 first." line appears, and dragging a blocked card is suppressed.

- [ ] **Step 5: Commit**

```bash
git add apps/phone/src/components/TaskCard.tsx apps/phone/src/components/SortableTaskCard.tsx
git commit -m "feat(phone): mega-chore chip and blocked-card styling"
```

---

### Task 19: Phone — EditTaskDialog shows the mega-chore chip

**Files:**
- Modify: `apps/phone/src/components/EditTaskDialog.tsx`

- [ ] **Step 1: Read the dialog to find its title area**

Open `apps/phone/src/components/EditTaskDialog.tsx`. Locate the component that renders the chore title near the top of the dialog (typically a `DialogTitle` or the first `TextField label="title"`).

- [ ] **Step 2: Add a read-only chip when `chore.megaChore` is present**

Immediately above the title row, add:

```tsx
{chore.megaChore && (
  <Typography
    sx={{
      fontFamily: mono,
      fontSize: 11,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      color: inkDim,
      mb: 0.75,
    }}
  >
    {chore.megaChore.title} · g{chore.megaChore.group}/{chore.megaChore.totalGroups}
  </Typography>
)}
```

If `mono` / `inkDim` aren't already imported in this file, add them to the existing `from "../theme"` import line.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @todoer/phone tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/phone/src/components/EditTaskDialog.tsx
git commit -m "feat(phone): show mega-chore chip in EditTaskDialog"
```

---

### Task 20: Manual smoke and final cleanup

This task does not write code. It is a deliberate verification pass that runs every path the spec calls out. If anything fails, file the bug as a follow-up — do not paper over it.

- [ ] **Step 1: Start the dev environment**

Run: `pnpm --filter @todoer/server dev`
Run (in a second terminal): `pnpm --filter @todoer/phone dev`

Expected: server boots and reports "ANTHROPIC_API_KEY" present (or warn if absent — set it in `.env` per `.env.example`). Phone serves on its dev port.

- [ ] **Step 2: Smoke 1 — Mega-chore happy path**

Log in. Navigate `/add` → "use a chore kit" → "mega chore". Describe **"clean the garage"**. Submit. Expect a clarifying question after a brief delay. Reply. After 1–2 questions, the breakdown should appear in the multi-chore review with 3–6 chores across 2–3 groups. Tweak any field. Tap "make it · N chores".

Expected: navigate to `/board`. Group-1 chores appear above the divider in **Ready**. Later groups appear below the divider, muted, with the "blocked — finish group N first" line. The mega-chore chip is visible on each card.

- [ ] **Step 3: Smoke 2 — Unblock cascade**

Complete every group-1 chore (drag to "done" or check off all steps so the chore auto-promotes). Refresh `/board`.

Expected: group-2 chores ungrey, their step lists reappear, and they are draggable. The divider has moved down (or disappears if group-2 was the last group).

- [ ] **Step 4: Smoke 3 — Kit-suggestion CTA**

Navigate `/add`. Type **"build a tick moat"** into the regular breakdown textarea and submit.

Expected: a 422 clarification renders an inline **"open the mega chore kit"** CTA. Click it. You land on `/add/kit/mega-chore` with the textarea prefilled with "build a tick moat".

- [ ] **Step 5: Smoke 4 — Force finalize mid-chat**

Start a new mega-chore chat. After the assistant asks its first question, instead of answering, click **"just give me the breakdown"** in the sticky top bar.

Expected: the next assistant turn produces a breakdown rather than another question.

- [ ] **Step 6: Smoke 5 — Move-blocked guard**

Open the browser devtools console. Find a blocked chore's id (e.g. via the Network panel's `/api/board` response). Issue:

```js
await fetch(`/api/tasks/<id>/move`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ lane: "doing" }),
});
```

Expected: HTTP 409 with `{"error":"blocked_by_mega_chore"}`.

- [ ] **Step 7: Smoke 6 — EditTaskDialog chip + completion cascade**

Tap a mega-chore chore in Ready to open `EditTaskDialog`. Verify the mega-chore chip is shown at the top. Mark it done from the dialog (via step toggles). Close the dialog and refresh.

Expected: dialog showed the chip; completion correctly promotes the next group on subsequent refresh.

- [ ] **Step 8: Final commit (only if anything changed during smoke testing)**

If you fixed a small issue during smoke testing, commit it as a focused follow-up:

```bash
git add <changed files>
git commit -m "fix(phone|server): <one-line description>"
```

Otherwise, no commit.

- [ ] **Step 9: Final typecheck and test pass**

Run: `pnpm -r typecheck && pnpm -r test -- --run`
Expected: PASS across the workspace.

---

## Notes for the implementing engineer

- **The Anthropic SDK key:** `ANTHROPIC_API_KEY` must be set for the `/turn` route to succeed. Without it, the route returns 503 and the kit screen renders the "couldn't reach the ai" alert — that's the intended behavior, but you can't smoke-test the chat without a key.
- **Chat is not persisted.** This is deliberate (per spec). Don't add a `localStorage` cache "for safety" — wait for the v2 work that introduces it intentionally.
- **`isBlocked` is derived, not stored.** Resist the temptation to add a `blocked` column for caching. If reads ever become slow with many mega-chores, revisit then.
- **Groups must be a consecutive 1..K sequence.** The schema enforces this. The review screen's `↑/↓` buttons keep it that way via the `remap` step. If you add new chore-edit affordances, make sure they preserve the invariant.
- **The `MEGA_CHORE_FORCE_FINALIZE_SUFFIX` toggle is on the system prompt**, not appended to messages. Each turn rebuilds the system prompt.
- **Drizzle migration journal.** If the test in Task 2 step 4 fails because the migrator doesn't pick up `0002`, hand-edit `apps/server/drizzle/meta/_journal.json` to add an entry mirroring the existing `0001` entry's shape. Don't fight `drizzle-kit`; just edit the JSON.
