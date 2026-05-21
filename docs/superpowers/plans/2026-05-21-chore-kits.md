# Chore Kits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "chore kit" framework to TODO-ER and ship the first kit — **packing** — including a picker UI on the Add screen, a structured form, a Claude-powered packing-list generator, step `notes` plumbing through the existing chore-with-steps model, and a suggestion hook from the standard AI breakdown.

**Architecture:** Approach 3 from the spec — shared shell (registry + picker route `/add/kit` + URL prefix `/add/kit/:id`), with each kit owning its own form, prompt, server endpoint, and (eventual) output adapter. Packing reuses the existing `BreakdownReview` and `/api/breakdown/accept` endpoint; the only schema change is an optional `notes` string on each step.

**Tech Stack:** TypeScript, pnpm workspaces, Fastify 5 + Drizzle ORM + SQLite (server), `@anthropic-ai/sdk`, React 19 + Vite + MUI v9 + TanStack Query + React Router 7 (phone), zod (shared), Vitest.

**Spec:** `docs/superpowers/specs/2026-05-21-chore-kits-design.md`

**Testing scope note:** The phone app has no React Testing Library setup today, and the existing `routes/breakdown.ts` has zero tests. This plan follows that convention: tests cover pure logic (prompt builders, zod schemas, registry shape). Screen and route wiring is verified via the manual smoke list in the spec. If you want broader UI/route tests later, that's a separate plan (adds RTL + jsdom infra to the phone, an SDK-mock harness to the server).

---

## File Map

**Shared (`packages/shared/src/`):**
- Modify `types.ts` — `BreakdownStep` gains `notes?: string`.
- Modify `schemas.ts` — `breakdownStepSchema` gains optional `notes`; add `packingFormSchema`.
- Modify `api.ts` — add `generatePackingKit` client function.
- Create `schemas.test.ts` — covers `packingFormSchema`.

**Server (`apps/server/src/`):**
- Create `services/kits/packing.ts` — `buildPackingUserMessage` (pure) + `generatePackingList` (Claude call).
- Create `services/kits/packing.test.ts` — covers `buildPackingUserMessage`.
- Create `routes/kits.ts` — `POST /api/kits/packing/generate`.
- Modify `routes/index.ts` — register `kitsRoutes` under the guarded plugin.
- Modify `services/breakdown.ts` — `BreakdownOutcome` carries optional `suggestedKitKind`; update `SYSTEM_PROMPT` and the `submit_breakdown` tool schema.
- Modify `routes/breakdown.ts` — include `suggestedKitKind` in the 422 body; the accept route writes `step.notes` when present.

**Phone (`apps/phone/src/`):**
- Create `kits/registry.ts` — `KITS` array.
- Create `kits/registry.test.ts` — covers `KITS` shape.
- Create `kits/packing/PackingKitScreen.tsx` — the form. Renders `BreakdownReview` on success.
- Create `kits/packing/use-packing-generator.ts` — TanStack mutation hook.
- Create `screens/KitsScreen.tsx` — the picker.
- Modify `App.tsx` — add `/add/kit` and `/add/kit/packing` routes.
- Modify `screens/AddScreen.tsx` — "use a chore kit" button + suggested-kit CTA.
- Modify `components/BreakdownReview.tsx` — render step `notes` (read-only by default, tap-to-edit).
- Modify `components/TaskCard.tsx` — render step `notes` inline beneath step title.
- Modify `components/EditTaskDialog.tsx` — step editor includes a notes textarea.

---

## Phase 1 — Shared types and schemas

### Task 1: Add `notes` to `BreakdownStep`

**Files:**
- Modify: `packages/shared/src/types.ts`
- Modify: `packages/shared/src/schemas.ts`

- [ ] **Step 1: Modify `types.ts`** — change the `BreakdownStep` interface:

```ts
/** A single <=10-minute step produced by the AI breakdown. */
export interface BreakdownStep {
  title: string;
  estimateMinutes: number;
  /** Optional free-text notes (e.g. packing-kit items: "passport, wallet, tickets"). */
  notes?: string;
}
```

- [ ] **Step 2: Modify `schemas.ts`** — update `breakdownStepSchema`:

```ts
export const breakdownStepSchema = z.object({
  title: z.string().trim().min(1).max(200),
  estimateMinutes: z.number().int().min(1).max(240),
  notes: z.string().max(2000).optional(),
});
```

- [ ] **Step 3: Typecheck** — from the repo root:

```
pnpm typecheck
```

Expected: PASS (no consumers of `BreakdownStep` currently set `notes`, so adding it as optional is safe).

- [ ] **Step 4: Commit**

```
git add packages/shared/src/types.ts packages/shared/src/schemas.ts
git commit -m "feat(shared): add optional notes to BreakdownStep"
```

---

### Task 2: Add `packingFormSchema`

**Files:**
- Modify: `packages/shared/src/schemas.ts`
- Create: `packages/shared/src/schemas.test.ts`

- [ ] **Step 1: Append the schema to `schemas.ts`** (after `acceptBreakdownSchema`):

```ts
export const PACKING_TRIP_TYPES = [
  "business",
  "leisure",
  "outdoors",
  "family visit",
  "beach",
  "ski",
] as const;
export type PackingTripType = (typeof PACKING_TRIP_TYPES)[number];

export const PACKING_CLIMATES = ["hot", "mild", "cold", "mixed", "rainy"] as const;
export type PackingClimate = (typeof PACKING_CLIMATES)[number];

export const packingFormSchema = z.object({
  destination: z.string().trim().min(1).max(80),
  nights: z.number().int().min(0).max(60),
  tripType: z.enum(PACKING_TRIP_TYPES),
  climate: z.enum(PACKING_CLIMATES),
  adults: z.number().int().min(1).max(20),
  children: z.number().int().min(0).max(20),
  dogs: z.number().int().min(0).max(20),
  anythingElse: z.string().max(500).optional(),
});
export type PackingFormInput = z.infer<typeof packingFormSchema>;
```

- [ ] **Step 2: Write the failing test — `packages/shared/src/schemas.test.ts`**:

```ts
import { describe, expect, it } from "vitest";
import { packingFormSchema } from "./schemas";

const valid = {
  destination: "Portland",
  nights: 3,
  tripType: "leisure" as const,
  climate: "mild" as const,
  adults: 1,
  children: 0,
  dogs: 0,
};

describe("packingFormSchema", () => {
  it("accepts a minimal valid form", () => {
    expect(packingFormSchema.parse(valid).destination).toBe("Portland");
  });

  it("accepts a day trip (nights = 0)", () => {
    expect(packingFormSchema.parse({ ...valid, nights: 0 }).nights).toBe(0);
  });

  it("trims destination", () => {
    expect(
      packingFormSchema.parse({ ...valid, destination: "  Paris  " }).destination,
    ).toBe("Paris");
  });

  it("rejects empty destination", () => {
    expect(() => packingFormSchema.parse({ ...valid, destination: "   " })).toThrow();
  });

  it("rejects nights = -1", () => {
    expect(() => packingFormSchema.parse({ ...valid, nights: -1 })).toThrow();
  });

  it("rejects nights = 61", () => {
    expect(() => packingFormSchema.parse({ ...valid, nights: 61 })).toThrow();
  });

  it("rejects adults = 0", () => {
    expect(() => packingFormSchema.parse({ ...valid, adults: 0 })).toThrow();
  });

  it("rejects unknown trip type", () => {
    expect(() =>
      packingFormSchema.parse({ ...valid, tripType: "spaceflight" as never }),
    ).toThrow();
  });

  it("rejects unknown climate", () => {
    expect(() =>
      packingFormSchema.parse({ ...valid, climate: "humid" as never }),
    ).toThrow();
  });

  it("rejects anythingElse over 500 chars", () => {
    expect(() =>
      packingFormSchema.parse({ ...valid, anythingElse: "x".repeat(501) }),
    ).toThrow();
  });

  it("accepts anythingElse exactly 500 chars", () => {
    expect(
      packingFormSchema.parse({ ...valid, anythingElse: "x".repeat(500) }).anythingElse,
    ).toHaveLength(500);
  });
});
```

- [ ] **Step 3: Run the test** — from `packages/shared`:

```
pnpm --filter @todoer/shared exec vitest run src/schemas.test.ts
```

Expected: PASS — 10 tests pass.

(If `@todoer/shared` has no `test` script yet, add `"test": "vitest run"` to `packages/shared/package.json` and add `vitest` to its devDependencies. Check first with `cat packages/shared/package.json`; if it has no test script, that's a sub-step here: add it, run `pnpm install`, then re-run.)

- [ ] **Step 4: Commit**

```
git add packages/shared/src/schemas.ts packages/shared/src/schemas.test.ts packages/shared/package.json
git commit -m "feat(shared): add packingFormSchema with full validation tests"
```

---

## Phase 2 — Server: step notes persistence

### Task 3: Persist `step.notes` in the accept-breakdown route

**Files:**
- Modify: `apps/server/src/routes/breakdown.ts`

- [ ] **Step 1: Modify the accept-route insert** — in the `for (const step of steps)` block, set `notes` from the step payload:

Change:
```ts
tx.insert(tasks)
  .values({
    id: randomUUID(),
    userId: req.userId,
    projectId: null,
    parentId: choreId,
    title: step.title,
    notes: "",
    area: null,
    estimateMinutes: step.estimateMinutes,
    ...
  })
```

To:
```ts
tx.insert(tasks)
  .values({
    id: randomUUID(),
    userId: req.userId,
    projectId: null,
    parentId: choreId,
    title: step.title,
    notes: step.notes ?? "",
    area: null,
    estimateMinutes: step.estimateMinutes,
    ...
  })
```

- [ ] **Step 2: Typecheck**

```
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```
git add apps/server/src/routes/breakdown.ts
git commit -m "feat(server): persist optional step.notes from accept-breakdown"
```

---

## Phase 3 — Server: packing kit service + route

### Task 4: Create the packing prompt-builder (pure)

**Files:**
- Create: `apps/server/src/services/kits/packing.ts`

- [ ] **Step 1: Create the file** with the pure helper + a placeholder generator stub (filled in next task). Make sure the directory exists first:

```
mkdir -p apps/server/src/services/kits
```

Then write `apps/server/src/services/kits/packing.ts`:

```ts
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { BreakdownPreview, PackingFormInput } from "@todoer/shared";

export const PACKING_SYSTEM_PROMPT = `You generate concise packing lists for someone with ADHD who needs a clear, ordered plan rather than a wall of items.

Rules:
- Output between 5 and 10 grouped steps. Each step is a packing CATEGORY (e.g. "pack documents"), not an individual item.
- Order steps in the sequence the user should pack them: documents first, bulky last, easy-to-forget at the end.
- Step title is a short imperative ("pack documents", "pack 3 days of clothes", "pack toiletries"). estimateMinutes is the realistic time to pack that category (3-10 minutes).
- Step notes is a comma-separated string of the actual items in that category. Be specific with sizes and counts where useful ("shirts × 3", "1 jacket").
- Adjust quantities to the number of nights and travelers. A 0-night trip is a day trip — pack lighter. Children imply extra changes and snacks. Dogs imply a small pet category (leash, food, bowl, bedding) when present.
- Use trip type and climate to drive what gets in (no swimwear for a ski trip, layers for cold, formal clothes for business if relevant).
- The user-supplied "Anything else" note may override or add to the above — respect it.

projectTitle: "Pack for {destination} · {nights}n", or "Pack for {destination} · day trip" when nights is 0.
area: "{destination} - Trip".

Always respond by calling the submit_packing_list tool.`;

export function buildPackingUserMessage(form: PackingFormInput): string {
  const lines = [
    "Trip:",
    `  destination: ${form.destination}`,
    `  nights: ${form.nights}`,
    `  trip type: ${form.tripType}`,
    `  climate: ${form.climate}`,
    `  travelers: ${form.adults} adult(s), ${form.children} child(ren), ${form.dogs} dog(s)`,
    `  anything else: ${form.anythingElse?.trim() || "—"}`,
  ];
  if (form.nights === 0) {
    lines.push("");
    lines.push(
      "Note: 0 nights means this is a day trip — pack lighter accordingly.",
    );
  }
  return lines.join("\n");
}

export function buildPackingProjectTitle(form: PackingFormInput): string {
  return form.nights === 0
    ? `Pack for ${form.destination} · day trip`
    : `Pack for ${form.destination} · ${form.nights}n`;
}

export function buildPackingArea(form: PackingFormInput): string {
  return `${form.destination} - Trip`;
}

// Filled in Task 6:
export async function generatePackingList(
  _form: PackingFormInput,
): Promise<BreakdownPreview> {
  throw new Error("generatePackingList not implemented yet");
}
```

- [ ] **Step 2: Typecheck**

```
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```
git add apps/server/src/services/kits/packing.ts
git commit -m "feat(server): scaffold packing kit with pure prompt-builders"
```

---

### Task 5: Test the pure helpers

**Files:**
- Create: `apps/server/src/services/kits/packing.test.ts`

- [ ] **Step 1: Write the failing test**:

```ts
import { describe, expect, it } from "vitest";
import type { PackingFormInput } from "@todoer/shared";
import {
  buildPackingArea,
  buildPackingProjectTitle,
  buildPackingUserMessage,
} from "./packing";

const base: PackingFormInput = {
  destination: "Portland",
  nights: 3,
  tripType: "leisure",
  climate: "mild",
  adults: 1,
  children: 0,
  dogs: 0,
};

describe("buildPackingUserMessage", () => {
  it("renders a multi-line block with all fields", () => {
    const msg = buildPackingUserMessage(base);
    expect(msg).toContain("destination: Portland");
    expect(msg).toContain("nights: 3");
    expect(msg).toContain("trip type: leisure");
    expect(msg).toContain("climate: mild");
    expect(msg).toContain("travelers: 1 adult(s), 0 child(ren), 0 dog(s)");
    expect(msg).toContain("anything else: —");
  });

  it("appends the day-trip note when nights is 0", () => {
    const msg = buildPackingUserMessage({ ...base, nights: 0 });
    expect(msg).toContain("nights: 0");
    expect(msg).toContain("day trip — pack lighter");
  });

  it("does NOT append the day-trip note for nights >= 1", () => {
    const msg = buildPackingUserMessage(base);
    expect(msg).not.toContain("day trip");
  });

  it("uses '—' when anythingElse is empty/missing", () => {
    expect(buildPackingUserMessage(base)).toContain("anything else: —");
    expect(
      buildPackingUserMessage({ ...base, anythingElse: "   " }),
    ).toContain("anything else: —");
  });

  it("includes anythingElse verbatim when present", () => {
    const msg = buildPackingUserMessage({
      ...base,
      anythingElse: "presenting on day 3",
    });
    expect(msg).toContain("anything else: presenting on day 3");
  });

  it("renders kids and dogs in the travelers line", () => {
    const msg = buildPackingUserMessage({
      ...base,
      adults: 2,
      children: 2,
      dogs: 1,
    });
    expect(msg).toContain("travelers: 2 adult(s), 2 child(ren), 1 dog(s)");
  });
});

describe("buildPackingProjectTitle", () => {
  it("uses '· {n}n' for multi-night trips", () => {
    expect(buildPackingProjectTitle(base)).toBe("Pack for Portland · 3n");
  });

  it("uses '· day trip' for nights = 0", () => {
    expect(buildPackingProjectTitle({ ...base, nights: 0 })).toBe(
      "Pack for Portland · day trip",
    );
  });
});

describe("buildPackingArea", () => {
  it("returns '{destination} - Trip'", () => {
    expect(buildPackingArea(base)).toBe("Portland - Trip");
    expect(buildPackingArea({ ...base, destination: "Cabin" })).toBe("Cabin - Trip");
  });
});
```

- [ ] **Step 2: Run the test**:

```
pnpm --filter @todoer/server test src/services/kits/packing.test.ts
```

Expected: PASS — all assertions pass against the helpers from Task 4.

- [ ] **Step 3: Commit**

```
git add apps/server/src/services/kits/packing.test.ts
git commit -m "test(server): cover packing prompt builders"
```

---

### Task 6: Implement the Claude call in `generatePackingList`

**Files:**
- Modify: `apps/server/src/services/kits/packing.ts`

- [ ] **Step 1: Replace the placeholder `generatePackingList`** with the real implementation. Append/replace at the bottom of `apps/server/src/services/kits/packing.ts`:

```ts
const toolOutputSchema = z.object({
  projectTitle: z.string(),
  area: z.string(),
  steps: z
    .array(
      z.object({
        title: z.string(),
        estimateMinutes: z.number(),
        notes: z.string(),
      }),
    )
    .min(1)
    .max(25),
});

export async function generatePackingList(
  form: PackingFormInput,
): Promise<BreakdownPreview> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  const message = await client.messages.create({
    model,
    max_tokens: 2000,
    system: PACKING_SYSTEM_PROMPT,
    tools: [
      {
        name: "submit_packing_list",
        description:
          "Submit the grouped packing list as ordered category steps with per-step item notes.",
        input_schema: {
          type: "object",
          properties: {
            projectTitle: { type: "string" },
            area: { type: "string" },
            steps: {
              type: "array",
              minItems: 5,
              maxItems: 10,
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  estimateMinutes: { type: "integer", minimum: 1, maximum: 30 },
                  notes: { type: "string" },
                },
                required: ["title", "estimateMinutes", "notes"],
              },
            },
          },
          required: ["projectTitle", "area", "steps"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "submit_packing_list" },
    messages: [{ role: "user", content: buildPackingUserMessage(form) }],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("the model did not return a packing list");
  }

  const parsed = toolOutputSchema.safeParse(toolUse.input);
  if (!parsed.success) throw new Error("the model returned a malformed packing list");

  const steps = parsed.data.steps
    .map((s) => ({
      title: s.title.trim(),
      estimateMinutes: Math.min(Math.max(Math.round(s.estimateMinutes), 1), 30),
      notes: s.notes.trim(),
    }))
    .filter((s) => s.title.length > 0);

  if (steps.length === 0) {
    throw new Error("the model returned an empty packing list");
  }

  // The model's projectTitle/area may differ from our deterministic ones — we
  // override with the deterministic versions so the auto-area grouping works
  // and the title stays in the expected format.
  return {
    projectTitle: buildPackingProjectTitle(form),
    area: buildPackingArea(form),
    steps,
  };
}
```

- [ ] **Step 2: Typecheck**

```
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 3: Re-run the existing packing test** — the helpers haven't changed, so all 10 assertions still pass:

```
pnpm --filter @todoer/server test src/services/kits/packing.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```
git add apps/server/src/services/kits/packing.ts
git commit -m "feat(server): wire packing kit Claude call with forced tool use"
```

---

### Task 7: Create the packing kit route

**Files:**
- Create: `apps/server/src/routes/kits.ts`

- [ ] **Step 1: Write the route file**:

```ts
import type { FastifyPluginAsync } from "fastify";
import { packingFormSchema } from "@todoer/shared";
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
};
```

- [ ] **Step 2: Typecheck**

```
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```
git add apps/server/src/routes/kits.ts
git commit -m "feat(server): add /api/kits/packing/generate route"
```

---

### Task 8: Register `kitsRoutes` in the guarded plugin

**Files:**
- Modify: `apps/server/src/routes/index.ts`

- [ ] **Step 1: Add the import** alongside the other route imports:

```ts
import { kitsRoutes } from "./kits";
```

- [ ] **Step 2: Register it inside the `guarded.register` block**, after `breakdownRoutes`:

```ts
await guarded.register(breakdownRoutes);
await guarded.register(kitsRoutes);
await guarded.register(focusRoutes);
```

- [ ] **Step 3: Start the dev server briefly to confirm the route loads** — from the repo root:

```
pnpm dev
```

Watch the server log for `Server listening at ...` with no errors, then `Ctrl-C`. (If you'd rather skip this — typecheck alone is fine.)

- [ ] **Step 4: Commit**

```
git add apps/server/src/routes/index.ts
git commit -m "feat(server): mount kits routes under guarded plugin"
```

---

### Task 9: Add the client function in `packages/shared/src/api.ts`

**Files:**
- Modify: `packages/shared/src/api.ts`

- [ ] **Step 1: Import `PackingFormInput`** at the top with the other type imports:

```ts
import type {
  AcceptBreakdownInput,
  CreateStepInput,
  CreateTaskInput,
  Credentials,
  MoveStepInput,
  MoveTaskInput,
  PackingFormInput,
  SetupInput,
  UpdateStepInput,
  UpdateTaskInput,
} from "./schemas";
```

- [ ] **Step 2: Append the function** right after `acceptBreakdown`:

```ts
export function generatePackingKit(
  input: PackingFormInput,
): Promise<BreakdownPreview> {
  return request<BreakdownPreview>("/kits/packing/generate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
```

- [ ] **Step 3: Typecheck**

```
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```
git add packages/shared/src/api.ts
git commit -m "feat(shared): add generatePackingKit client function"
```

---

## Phase 4 — Server: AI-breakdown suggestion hook

### Task 10: Extend `BreakdownOutcome` with `suggestedKitKind`

**Files:**
- Modify: `apps/server/src/services/breakdown.ts`

- [ ] **Step 1: Change the type** in `services/breakdown.ts`:

```ts
export type BreakdownOutcome =
  | { actionable: true; projectTitle: string; area: string; steps: BreakdownStep[] }
  | { actionable: false; clarification: string; suggestedKitKind?: string };
```

- [ ] **Step 2: Update `toolOutputSchema`** in the same file to include the new optional output:

```ts
const toolOutputSchema = z.object({
  isActionable: z.boolean(),
  clarification: z.string().optional(),
  suggestedKitKind: z.string().optional(),
  projectTitle: z.string(),
  area: z.string(),
  steps: z.array(
    z.object({
      title: z.string(),
      estimateMinutes: z.number(),
    }),
  ),
});
```

- [ ] **Step 3: Update `SYSTEM_PROMPT`** by appending a new paragraph just before the closing line `"Always respond by calling the submit_breakdown tool."`:

```
There are specialized chore generators ("chore kits") that handle some task types better than this open-ended breakdown:
- "packing" — packing for a trip (destination, nights, who's going, etc.).

If the input clearly describes a kit-supported task (e.g. "pack for paris", "what to bring for the camping trip"), set isActionable to false, put a short clarification like "this sounds like packing for a trip — try the packing kit", and set suggestedKitKind to the matching kit id (currently only "packing"). Do NOT set suggestedKitKind unless the input matches a supported kit.
```

- [ ] **Step 4: Update the tool schema** in the same file — inside the `tools[0].input_schema.properties`, add:

```ts
suggestedKitKind: {
  type: "string",
  description:
    "When isActionable is false and the input matches a chore kit, the kit id (e.g. 'packing').",
},
```

- [ ] **Step 5: Update the not-actionable return** to surface the suggestion:

```ts
if (!data.isActionable) {
  return {
    actionable: false,
    clarification:
      data.clarification?.trim() ||
      "Could you describe the task in a little more detail?",
    suggestedKitKind: data.suggestedKitKind?.trim() || undefined,
  };
}
```

- [ ] **Step 6: Typecheck**

```
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```
git add apps/server/src/services/breakdown.ts
git commit -m "feat(server): let breakdown suggest a chore kit when applicable"
```

---

### Task 11: Surface `suggestedKitKind` in the 422 response

**Files:**
- Modify: `apps/server/src/routes/breakdown.ts`

- [ ] **Step 1: Update the not-actionable branch** of `app.post("/breakdown", …)`:

Replace:
```ts
if (!outcome.actionable) {
  return reply
    .code(422)
    .send({ error: "needs_clarification", clarification: outcome.clarification });
}
```

With:
```ts
if (!outcome.actionable) {
  return reply.code(422).send({
    error: "needs_clarification",
    clarification: outcome.clarification,
    suggestedKitKind: outcome.suggestedKitKind,
  });
}
```

- [ ] **Step 2: Typecheck**

```
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```
git add apps/server/src/routes/breakdown.ts
git commit -m "feat(server): include suggestedKitKind in breakdown 422 body"
```

---

## Phase 5 — Phone: kit registry + picker screen

### Task 12: Create the `KITS` registry

**Files:**
- Create: `apps/phone/src/kits/registry.ts`
- Create: `apps/phone/src/kits/registry.test.ts`

- [ ] **Step 1: Make the dir + write `registry.ts`**:

```
mkdir -p apps/phone/src/kits
```

```ts
// apps/phone/src/kits/registry.ts
export interface KitEntry {
  /** Stable id; also forms the route as `/add/kit/${id}`. */
  id: string;
  title: string;
  blurb: string;
  /** 2-char monogram shown in the picker card icon tile. */
  icon: string;
  enabled: boolean;
}

export const KITS: readonly KitEntry[] = [
  {
    id: "packing",
    title: "packing",
    blurb: "a trip → a packing list, grouped by category.",
    icon: "PK",
    enabled: true,
  },
  {
    id: "mega-chore",
    title: "mega chore",
    blurb: "one huge thing → several chores, each with steps.",
    icon: "MC",
    enabled: false,
  },
];

export function kitRoute(id: string): string {
  return `/add/kit/${id}`;
}

export function findKit(id: string | undefined | null): KitEntry | undefined {
  if (!id) return undefined;
  return KITS.find((k) => k.id === id);
}
```

- [ ] **Step 2: Write the failing test** at `apps/phone/src/kits/registry.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { findKit, kitRoute, KITS } from "./registry";

describe("KITS registry", () => {
  it("is non-empty", () => {
    expect(KITS.length).toBeGreaterThan(0);
  });

  it("has unique ids", () => {
    const ids = KITS.map((k) => k.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each entry has the required shape", () => {
    for (const k of KITS) {
      expect(typeof k.id).toBe("string");
      expect(k.id.length).toBeGreaterThan(0);
      expect(typeof k.title).toBe("string");
      expect(typeof k.blurb).toBe("string");
      expect(typeof k.icon).toBe("string");
      expect(typeof k.enabled).toBe("boolean");
    }
  });

  it("packing is enabled", () => {
    expect(findKit("packing")?.enabled).toBe(true);
  });

  it("mega-chore exists and is disabled", () => {
    expect(findKit("mega-chore")?.enabled).toBe(false);
  });
});

describe("kitRoute", () => {
  it("formats /add/kit/{id}", () => {
    expect(kitRoute("packing")).toBe("/add/kit/packing");
  });
});

describe("findKit", () => {
  it("returns undefined for missing id", () => {
    expect(findKit("unknown")).toBeUndefined();
  });

  it("returns undefined for null/empty", () => {
    expect(findKit(null)).toBeUndefined();
    expect(findKit("")).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run the test**:

```
pnpm --filter @todoer/phone test src/kits/registry.test.ts
```

Expected: PASS — all assertions pass.

- [ ] **Step 4: Commit**

```
git add apps/phone/src/kits/registry.ts apps/phone/src/kits/registry.test.ts
git commit -m "feat(phone): add KITS registry with shape tests"
```

---

### Task 13: Build the `KitsScreen` picker

**Files:**
- Create: `apps/phone/src/screens/KitsScreen.tsx`

- [ ] **Step 1: Inspect `AddScreen.tsx`** (lines 96–118) for the toolbar pattern, then create `apps/phone/src/screens/KitsScreen.tsx`:

```tsx
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  Box,
  IconButton,
  Toolbar,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router";
import { Sticker } from "../components/Chrome";
import { kitRoute, KITS, type KitEntry } from "../kits/registry";
import {
  bg,
  bgCard,
  blue,
  display,
  ink,
  inkDim,
  mono,
  pink,
  pinkSoft,
} from "../theme";

export function KitsScreen() {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <Box sx={{ bgcolor: ink, color: bg }}>
        <Toolbar sx={{ minHeight: 56, px: 1 }}>
          <IconButton
            edge="start"
            onClick={() => navigate("/add")}
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
            chore_kits
            <Box component="span" sx={{ color: pink }}>.</Box>
          </Typography>
        </Toolbar>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: "auto", p: 3, maxWidth: 540, mx: "auto", width: "100%" }}>
        <Sticker color="yellow" rotate={-2}>
          guided
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
            mb: 2,
            textShadow: `2px 2px 0 ${pink}, -2px -2px 0 ${blue}`,
          }}
        >
          pick a{" "}
          <Box component="span" sx={{ color: pink }}>
            kit.
          </Box>
        </Typography>

        {KITS.map((kit) => (
          <KitCard
            key={kit.id}
            kit={kit}
            onSelect={() => navigate(kitRoute(kit.id))}
          />
        ))}
      </Box>
    </Box>
  );
}

function KitCard({ kit, onSelect }: { kit: KitEntry; onSelect: () => void }) {
  const disabled = !kit.enabled;
  return (
    <Box
      onClick={disabled ? undefined : onSelect}
      role={disabled ? undefined : "button"}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) onSelect();
      }}
      sx={{
        bgcolor: bgCard,
        border: `2px solid ${ink}`,
        p: 1.5,
        mb: 1.25,
        display: "flex",
        gap: 1.5,
        alignItems: "center",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1,
        "&:hover": disabled ? {} : { bgcolor: pinkSoft, color: ink },
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          bgcolor: ink,
          color: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: display,
          fontWeight: 900,
          fontSize: 22,
          flexShrink: 0,
        }}
      >
        {kit.icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: display,
            fontWeight: 900,
            fontSize: 22,
            textTransform: "uppercase",
            letterSpacing: "0.02em",
            lineHeight: 1,
          }}
        >
          {kit.title}
        </Typography>
        <Typography
          sx={{
            fontFamily: mono,
            fontSize: 11,
            color: inkDim,
            mt: 0.5,
            letterSpacing: "0.02em",
          }}
        >
          {kit.blurb}
        </Typography>
      </Box>
      {disabled ? (
        <Typography
          sx={{
            fontFamily: mono,
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: inkDim,
          }}
        >
          soon
        </Typography>
      ) : (
        <Box
          component="span"
          sx={{ fontFamily: display, fontWeight: 900, fontSize: 26, color: pink }}
        >
          →
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Typecheck**

```
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```
git add apps/phone/src/screens/KitsScreen.tsx
git commit -m "feat(phone): add KitsScreen picker with card grid layout"
```

---

### Task 14: Wire `/add/kit` into the router

**Files:**
- Modify: `apps/phone/src/App.tsx`

- [ ] **Step 1: Import the screen** at the top of `App.tsx`:

```tsx
import { KitsScreen } from "./screens/KitsScreen";
```

- [ ] **Step 2: Add the route inside `<Routes>`** right after the existing `/add` route:

```tsx
<Route path="/add/kit" element={<KitsScreen />} />
```

- [ ] **Step 3: Typecheck**

```
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```
git add apps/phone/src/App.tsx
git commit -m "feat(phone): route /add/kit to KitsScreen"
```

---

## Phase 6 — Phone: packing kit screen + hook

### Task 15: Create the packing mutation hook

**Files:**
- Create: `apps/phone/src/kits/packing/use-packing-generator.ts`

- [ ] **Step 1: Make the dir + write the hook**:

```
mkdir -p apps/phone/src/kits/packing
```

```ts
// apps/phone/src/kits/packing/use-packing-generator.ts
import { useMutation } from "@tanstack/react-query";
import { generatePackingKit } from "@todoer/shared";

export function usePackingGenerator() {
  return useMutation({ mutationFn: generatePackingKit });
}
```

- [ ] **Step 2: Typecheck**

```
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```
git add apps/phone/src/kits/packing/use-packing-generator.ts
git commit -m "feat(phone): add usePackingGenerator mutation hook"
```

---

### Task 16: Build `PackingKitScreen`

**Files:**
- Create: `apps/phone/src/kits/packing/PackingKitScreen.tsx`

- [ ] **Step 1: Read `AddScreen.tsx`** for layout conventions (toolbar, Sticker, button style). Then write `apps/phone/src/kits/packing/PackingKitScreen.tsx`:

```tsx
import { useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router";
import {
  ApiError,
  PACKING_CLIMATES,
  PACKING_TRIP_TYPES,
  packingFormSchema,
  type AcceptBreakdownInput,
  type BreakdownPreview,
  type PackingClimate,
  type PackingFormInput,
  type PackingTripType,
} from "@todoer/shared";
import { BreakdownReview } from "../../components/BreakdownReview";
import { Sticker } from "../../components/Chrome";
import { useAcceptBreakdown, useAreas } from "../../lib/api-hooks";
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
import { usePackingGenerator } from "./use-packing-generator";

interface FormState {
  destination: string;
  nights: string;
  tripType: PackingTripType;
  climate: PackingClimate;
  adults: string;
  children: string;
  dogs: string;
  anythingElse: string;
}

const DEFAULT_FORM: FormState = {
  destination: "",
  nights: "1",
  tripType: "leisure",
  climate: "mild",
  adults: "1",
  children: "0",
  dogs: "0",
  anythingElse: "",
};

function parseForm(s: FormState): PackingFormInput | null {
  const parsed = packingFormSchema.safeParse({
    destination: s.destination,
    nights: Number(s.nights),
    tripType: s.tripType,
    climate: s.climate,
    adults: Number(s.adults),
    children: Number(s.children),
    dogs: Number(s.dogs),
    anythingElse: s.anythingElse.trim() || undefined,
  });
  return parsed.success ? parsed.data : null;
}

export function PackingKitScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const areas = useAreas();
  const generator = usePackingGenerator();
  const accept = useAcceptBreakdown();

  // If we arrived via the suggested-kit CTA, the AddScreen passed the original
  // textarea text in location.state.prefillText — seed it into Anything Else.
  const prefillText =
    typeof (location.state as { prefillText?: unknown } | null)?.prefillText ===
    "string"
      ? ((location.state as { prefillText: string }).prefillText)
      : "";

  const [form, setForm] = useState<FormState>({
    ...DEFAULT_FORM,
    anythingElse: prefillText,
  });
  const [preview, setPreview] = useState<BreakdownPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const validInput = parseForm(form);
  const canSubmit = validInput !== null && !generator.isPending;

  function onSubmit() {
    if (!validInput) return;
    setError(null);
    generator.mutate(validInput, {
      onSuccess: (p) => setPreview(p),
      onError: (err) => {
        if (err instanceof ApiError && err.status === 429) {
          setError("hit the packing kit rate limit — try again in a bit.");
        } else {
          setError(
            "couldn't reach the ai — try again, or add a single task from the add screen.",
          );
        }
      },
    });
  }

  function handleAccept(input: AcceptBreakdownInput) {
    accept.mutate(input, { onSuccess: () => navigate("/board") });
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
            packing_kit
            <Box component="span" sx={{ color: pink }}>.</Box>
          </Typography>
        </Toolbar>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
        {preview ? (
          <BreakdownReview
            preview={preview}
            areas={areas.data ?? []}
            accepting={accept.isPending}
            error={accept.isError}
            onAccept={handleAccept}
            onStartOver={() => setPreview(null)}
          />
        ) : (
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
                pack a trip
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
                where to,{" "}
                <Box component="span" sx={{ color: pink }}>
                  who's going?
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
                fill it in. claude builds a grouped packing list.
              </Typography>
            </Box>

            <TextField
              label="destination"
              value={form.destination}
              onChange={(e) => update("destination", e.target.value)}
              fullWidth
              autoFocus
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="nights"
                type="number"
                value={form.nights}
                onChange={(e) => update("nights", e.target.value)}
                sx={{ width: 120 }}
                inputProps={{ min: 0, max: 60 }}
              />
              <TextField
                select
                label="trip type"
                value={form.tripType}
                onChange={(e) =>
                  update("tripType", e.target.value as PackingTripType)
                }
                fullWidth
              >
                {PACKING_TRIP_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <TextField
              select
              label="climate"
              value={form.climate}
              onChange={(e) => update("climate", e.target.value as PackingClimate)}
              fullWidth
            >
              {PACKING_CLIMATES.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>

            <Box>
              <Typography
                sx={{
                  fontFamily: mono,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: inkDim,
                  mb: 1,
                }}
              >
                travelers
              </Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="adults"
                  type="number"
                  value={form.adults}
                  onChange={(e) => update("adults", e.target.value)}
                  inputProps={{ min: 1, max: 20 }}
                  sx={{ width: 100 }}
                />
                <TextField
                  label="children"
                  type="number"
                  value={form.children}
                  onChange={(e) => update("children", e.target.value)}
                  inputProps={{ min: 0, max: 20 }}
                  sx={{ width: 100 }}
                />
                <TextField
                  label="dogs"
                  type="number"
                  value={form.dogs}
                  onChange={(e) => update("dogs", e.target.value)}
                  inputProps={{ min: 0, max: 20 }}
                  sx={{ width: 100 }}
                />
              </Stack>
            </Box>

            <TextField
              label="anything else (optional)"
              value={form.anythingElse}
              onChange={(e) => update("anythingElse", e.target.value)}
              multiline
              minRows={2}
              fullWidth
              inputProps={{ maxLength: 500 }}
            />

            <Button
              variant="contained"
              size="large"
              startIcon={
                generator.isPending ? (
                  <CircularProgress size={18} sx={{ color: yellow }} />
                ) : undefined
              }
              onClick={onSubmit}
              disabled={!canSubmit}
              sx={{ py: 2.25, fontSize: 18, justifyContent: "space-between" }}
            >
              <Box component="span">
                {generator.isPending ? "packing it…" : "pack it"}
              </Box>
              {!generator.isPending && (
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

            {error && <Alert severity="warning">{error}</Alert>}
          </Box>
        )}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Typecheck**

```
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```
git add apps/phone/src/kits/packing/PackingKitScreen.tsx
git commit -m "feat(phone): add PackingKitScreen with structured form"
```

---

### Task 17: Route `/add/kit/packing`

**Files:**
- Modify: `apps/phone/src/App.tsx`

- [ ] **Step 1: Import** at the top:

```tsx
import { PackingKitScreen } from "./kits/packing/PackingKitScreen";
```

- [ ] **Step 2: Add the route** right after the `/add/kit` route:

```tsx
<Route path="/add/kit/packing" element={<PackingKitScreen />} />
```

- [ ] **Step 3: Typecheck**

```
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```
git add apps/phone/src/App.tsx
git commit -m "feat(phone): route /add/kit/packing to PackingKitScreen"
```

---

## Phase 7 — Phone: AddScreen wiring

### Task 18: Add the "use a chore kit" button

**Files:**
- Modify: `apps/phone/src/screens/AddScreen.tsx`

- [ ] **Step 1: Insert a new button** immediately after the "break it down with ai" `<Button>` block (which ends with `</Button>` on a line near `clarification && ...`). Insert before `{clarification && ...}`:

```tsx
<Button
  variant="outlined"
  size="large"
  onClick={() => navigate("/add/kit")}
  sx={{
    py: 1.75,
    fontSize: 14,
    justifyContent: "space-between",
  }}
>
  <Box component="span">use a chore kit</Box>
  <Box
    component="span"
    sx={{ fontFamily: display, fontWeight: 900, fontSize: 22, color: pink }}
  >
    →
  </Box>
</Button>
```

- [ ] **Step 2: Typecheck**

```
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```
git add apps/phone/src/screens/AddScreen.tsx
git commit -m "feat(phone): add 'use a chore kit' button to AddScreen"
```

---

### Task 19: Suggested-kit CTA in the AddScreen clarification

**Files:**
- Modify: `apps/phone/src/screens/AddScreen.tsx`

- [ ] **Step 1: Add the import** at the top of `AddScreen.tsx`:

```tsx
import { findKit, kitRoute } from "../kits/registry";
```

- [ ] **Step 2: Add a state hook** alongside the existing `useState` calls:

```tsx
const [suggestedKitKind, setSuggestedKitKind] = useState<string | null>(null);
```

- [ ] **Step 3: Update `runBreakdown` to capture `suggestedKitKind`** — change the 422 branch:

Replace:
```ts
breakdown.mutate(trimmed, {
  onSuccess: (result) => setPreview(result),
  onError: (err) => {
    if (err instanceof ApiError && err.status === 422) {
      const detail = err.detail as { clarification?: string } | undefined;
      setClarification(detail?.clarification ?? "could you add a little more detail?");
    } else {
      setAiUnavailable(true);
      if (manualTitle.trim().length === 0) setManualTitle(trimmed);
    }
  },
});
```

With:
```ts
setSuggestedKitKind(null);
breakdown.mutate(trimmed, {
  onSuccess: (result) => setPreview(result),
  onError: (err) => {
    if (err instanceof ApiError && err.status === 422) {
      const detail = err.detail as
        | { clarification?: string; suggestedKitKind?: string }
        | undefined;
      setClarification(detail?.clarification ?? "could you add a little more detail?");
      setSuggestedKitKind(detail?.suggestedKitKind ?? null);
    } else {
      setAiUnavailable(true);
      if (manualTitle.trim().length === 0) setManualTitle(trimmed);
    }
  },
});
```

- [ ] **Step 4: Render the CTA** — replace the existing `{clarification && <Alert ...>}` with:

```tsx
{clarification && (
  <Alert severity="info" sx={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 1 }}>
    <Box>{clarification}</Box>
    {(() => {
      const kit = findKit(suggestedKitKind);
      if (!kit || !kit.enabled) return null;
      return (
        <Button
          variant="contained"
          size="small"
          onClick={() =>
            navigate(kitRoute(kit.id), { state: { prefillText: text.trim() } })
          }
          sx={{
            alignSelf: "flex-start",
            mt: 0.5,
            fontSize: 12,
          }}
        >
          open the {kit.title} kit →
        </Button>
      );
    })()}
  </Alert>
)}
```

- [ ] **Step 5: Typecheck**

```
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```
git add apps/phone/src/screens/AddScreen.tsx
git commit -m "feat(phone): inline kit-suggestion CTA in breakdown clarification"
```

---

## Phase 8 — Phone: step-notes UI

### Task 20: Render step notes in `BreakdownReview`

**Files:**
- Modify: `apps/phone/src/components/BreakdownReview.tsx`

- [ ] **Step 1: Extend `EditableStep`** at the top of the file:

```ts
interface EditableStep {
  key: string;
  title: string;
  estimate: string;
  notes: string;
  notesExpanded: boolean;
}
```

- [ ] **Step 2: Seed `notes`** in the `useState` initializer for steps:

```ts
const [steps, setSteps] = useState<EditableStep[]>(() =>
  preview.steps.map((s) => ({
    key: nextKey(),
    title: s.title,
    estimate: String(s.estimateMinutes),
    notes: s.notes ?? "",
    notesExpanded: false,
  })),
);
```

- [ ] **Step 3: Update `addStep`** to include `notes`:

```ts
function addStep() {
  setSteps((prev) => [
    ...prev,
    { key: nextKey(), title: "", estimate: "5", notes: "", notesExpanded: false },
  ]);
}
```

- [ ] **Step 4: Update `validSteps`** to include `notes` in the output payload, but only when non-empty:

```ts
const validSteps = steps
  .map((s) => ({
    title: s.title.trim(),
    estimateMinutes: Number(s.estimate),
    notes: s.notes.trim() || undefined,
  }))
  .filter(
    (s) =>
      s.title.length > 0 &&
      Number.isInteger(s.estimateMinutes) &&
      s.estimateMinutes >= 1,
  );
```

- [ ] **Step 5: Render the notes block inside each step row** — inside the existing `<Box key={step.key} sx={{ ... }}>`, after the title `<TextField>` row, add a sub-block. Look for the closing `</IconButton>` of the delete-step button; right after the surrounding `<Box>` closes the title-row content, add this block before the outer step `<Box>` closes:

Locate the structure (around lines 187–260 of the current `BreakdownReview.tsx`):

```tsx
<Box key={step.key} sx={{ display: "flex", gap: 1, alignItems: "flex-start", ... }}>
  <Box>{index + 1}</Box>
  <TextField title />
  <TextField estimate />
  <Typography>m</Typography>
  <IconButton remove />
</Box>
```

Restructure to wrap the existing row in an outer column container, then add a notes row beneath it:

```tsx
<Box
  key={step.key}
  sx={{
    bgcolor: bgCard,
    border: `2px solid ${ink}`,
    p: 1,
  }}
>
  <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
    {/* existing index badge + title field + estimate field + m label + remove icon */}
  </Box>
  {(step.notes.length > 0 || step.notesExpanded) ? (
    <TextField
      value={step.notes}
      onChange={(e) => updateStep(step.key, { notes: e.target.value })}
      placeholder="items in this step (comma-separated)"
      size="small"
      fullWidth
      multiline
      sx={{
        mt: 0.75,
        "& .MuiOutlinedInput-notchedOutline": { border: "none" },
        "& textarea": {
          fontFamily: mono,
          fontSize: 11,
          color: inkDim,
        },
      }}
    />
  ) : (
    <Box
      onClick={() => updateStep(step.key, { notesExpanded: true })}
      sx={{
        mt: 0.5,
        fontFamily: mono,
        fontSize: 10,
        color: inkDim,
        cursor: "pointer",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
      }}
    >
      + add items
    </Box>
  )}
</Box>
```

Move the existing `bgcolor`/`border`/`p: 1` styling off the inner row and onto the outer column (as shown above). The inner row keeps only `display: "flex", gap: 1, alignItems: "flex-start"`.

- [ ] **Step 6: Typecheck**

```
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```
git add apps/phone/src/components/BreakdownReview.tsx
git commit -m "feat(phone): render and edit step notes in BreakdownReview"
```

---

### Task 21: Render step notes inline on `TaskCard`

**Files:**
- Modify: `apps/phone/src/components/TaskCard.tsx`

Background: `StepRow` in `TaskCard.tsx` (lines 224–307) is currently a single horizontal `<Box sx={{ display: "flex", … }}>` containing checkbox, title (with `01.` index prefix), and estimate (`{n}m`). To show notes underneath the title, we wrap the existing row in a column container and add a notes `<Typography>` below it.

- [ ] **Step 1: Restructure the StepRow return** in `apps/phone/src/components/TaskCard.tsx`. Replace the entire `return ( … )` block of `StepRow` (lines 238–306) with:

```tsx
  return (
    <Box
      sx={{
        bgcolor: isCurrent ? yellow : "transparent",
        borderLeft: isCurrent ? `3px solid ${ink}` : `3px solid transparent`,
        opacity: completed ? 0.5 : 1,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          px: 0.5,
          py: 0.35,
        }}
      >
        <Box
          component="button"
          onClick={toggleCheck}
          aria-label={
            completed ? `Uncheck step "${step.title}"` : `Mark step "${step.title}" done`
          }
          sx={{
            all: "unset",
            cursor: updateStep.isPending ? "default" : "pointer",
            color: ink,
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          {completed ? (
            <CheckBoxIcon sx={{ fontSize: 16, color: pink }} />
          ) : (
            <CheckBoxOutlineBlankIcon sx={{ fontSize: 16, color: ink }} />
          )}
        </Box>
        <Typography
          sx={{
            flexGrow: 1,
            fontFamily: mono,
            fontSize: 11.5,
            fontWeight: isCurrent ? 500 : 400,
            textDecoration: completed ? "line-through" : "none",
            color: completed ? inkFaint : ink,
            lineHeight: 1.3,
          }}
        >
          <Box
            component="span"
            sx={{
              color: isCurrent ? ink : inkDim,
              fontWeight: 500,
              mr: 0.75,
            }}
          >
            {String(index + 1).padStart(2, "0")}.
          </Box>
          {step.title}
        </Typography>
        <Typography
          sx={{
            fontFamily: mono,
            fontSize: 10,
            letterSpacing: "0.05em",
            color: completed ? inkFaint : inkDim,
            whiteSpace: "nowrap",
          }}
        >
          {step.estimateMinutes}m
        </Typography>
      </Box>
      {step.notes && step.notes.trim().length > 0 && (
        <Typography
          sx={{
            fontFamily: mono,
            fontSize: 10.5,
            color: inkDim,
            lineHeight: 1.35,
            pl: 3.25,
            pr: 1,
            pb: 0.5,
            whiteSpace: "pre-wrap",
            textDecoration: completed ? "line-through" : "none",
          }}
        >
          {step.notes}
        </Typography>
      )}
    </Box>
  );
```

Note: the outer `Box` now holds the `isCurrent` highlight (border + bg). The inner flex `Box` holds the original row. The notes `Typography` sits below, indented (`pl: 3.25`) to roughly align under the title text past the checkbox.

- [ ] **Step 2: Typecheck**

```
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```
git add apps/phone/src/components/TaskCard.tsx
git commit -m "feat(phone): show step notes inline on TaskCard"
```

---

### Task 22: Add a notes editor for steps in `EditTaskDialog`

**Files:**
- Modify: `packages/shared/src/schemas.ts`
- Modify: `apps/server/src/routes/steps.ts`
- Modify: `apps/phone/src/components/EditTaskDialog.tsx`

Background: `EditTaskDialog.tsx`'s `StepRow` (lines 410–603) has a horizontal row of inputs: index badge, complete checkbox, title `<TextField>` (commits on blur), estimate `<TextField>` (commits on blur), drag handle, delete. We add a notes `<TextField>` underneath this row, committing on blur via the existing `useUpdateStep` mutation. The PATCH `/tasks/:choreId/steps/:stepId` route handler (`apps/server/src/routes/steps.ts:82-118`) writes fields explicitly (not by spread), so it needs an explicit `notes` branch.

- [ ] **Step 1: Extend `updateStepSchema`** in `packages/shared/src/schemas.ts`:

```ts
export const updateStepSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  estimateMinutes: z.number().int().min(1).max(240).optional(),
  notes: z.string().max(2000).optional(),
  /** Toggle completion. true = check (sets completedAt = now). false = uncheck. */
  completed: z.boolean().optional(),
});
```

- [ ] **Step 2: Persist `notes` in the PATCH-step route** — `apps/server/src/routes/steps.ts`, inside the `app.patch` handler. After the existing `if (parsed.data.estimateMinutes !== undefined) { ... }` block and before `if (parsed.data.completed !== undefined) { ... }`, insert:

```ts
if (parsed.data.notes !== undefined) {
  next.notes = parsed.data.notes;
}
```

- [ ] **Step 3: Add a notes input to the step row** in `apps/phone/src/components/EditTaskDialog.tsx`'s `StepRow` (around lines 410–603).

**3a:** Add state and a commit handler near the existing `commitEstimate` (after line 458). Insert these alongside the existing `useState` calls for `title` and `estimate` (around lines 411–412):

```tsx
  const [notesText, setNotesText] = useState(step.notes);
```

Then update the existing `useEffect` (lines 418–421) that resyncs on step changes:

```tsx
  useEffect(() => {
    setTitle(step.title);
    setEstimate(String(step.estimateMinutes));
    setNotesText(step.notes);
  }, [step.title, step.estimateMinutes, step.notes]);
```

Add a `commitNotes` function next to `commitEstimate`:

```tsx
  function commitNotes() {
    const trimmed = notesText.trim();
    if (trimmed === (step.notes ?? "")) return;
    updateStep.mutate({
      choreId,
      stepId: step.id,
      input: { notes: trimmed },
    });
  }
```

**3b:** Restructure the StepRow return so the inputs row is wrapped in a column and a notes `<TextField>` sits beneath it. Find the `return (` block of `StepRow` (line 472). The outer container is currently `<Box ref={setNodeRef} sx={{ display: "flex", alignItems: "stretch", … }}>` containing the inline row of inputs. Restructure as:

```tsx
  return (
    <Box
      ref={setNodeRef}
      sx={{
        opacity: isDragging ? 0.5 : 1,
        transform: CSS.Transform.toString(transform),
        transition,
        border: `2px solid ${ink}`,
        bgcolor: bgCard,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "stretch", gap: 0 }}>
        {/* existing index badge, checkbox, title TextField, estimate TextField,
            "m" Typography, drag handle, delete button — unchanged. Remove the
            `border`, `bgcolor`, `transform`, `transition`, `opacity`, and `ref`
            from this inner Box since they now live on the outer container. */}
      </Box>
      <TextField
        value={notesText}
        onChange={(e) => setNotesText(e.target.value)}
        onBlur={commitNotes}
        placeholder="items / notes for this step"
        multiline
        size="small"
        fullWidth
        slotProps={{ input: { disableUnderline: true } }}
        variant="standard"
        sx={{
          borderTop: `2px solid ${ink}`,
          px: 1,
          py: 0.5,
          "& .MuiInput-input": {
            fontFamily: mono,
            fontSize: 11,
            color: inkDim,
            lineHeight: 1.35,
          },
        }}
      />
    </Box>
  );
```

Important: move the `ref`, `transform`, `transition`, `isDragging`, `border`, `bgcolor` props onto the outer container, and strip them from the inner inputs row. Keep all the inputs inside the inner row exactly as they were (lines 486–600).

- [ ] **Step 4: Typecheck**

```
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 5: Manual smoke** — start the dev server, open a packing chore on the board, edit a step's notes, blur the field, reload. Notes persist.

```
pnpm dev
```

- [ ] **Step 6: Commit**

```
git add packages/shared/src/schemas.ts apps/server/src/routes/steps.ts apps/phone/src/components/EditTaskDialog.tsx
git commit -m "feat: edit step notes from EditTaskDialog"
```

---

## Phase 9 — Final verification

### Task 23: Full repo verification + manual smoke walkthrough

**Files:** none (verification only)

- [ ] **Step 1: Typecheck everything** from the repo root:

```
pnpm typecheck
```

Expected: PASS for every package.

- [ ] **Step 2: Run the test suite** from the repo root:

```
pnpm test
```

Expected: PASS — at minimum the new tests (packing schemas, packing prompt builders, KITS registry) plus the existing ones (board-dnd, selection, chore-state, backfill-chores).

- [ ] **Step 3: Manual smoke list** — start the dev server and walk through each item from the spec's smoke list:

```
pnpm dev
```

1. /add → "use a chore kit" → /add/kit → tap "packing" → /add/kit/packing.
2. Fill: destination = "Portland", nights = 3, trip type = leisure, climate = mild, adults = 1, children = 0, dogs = 0, anything else blank. Tap "pack it".
3. Review screen shows 5–10 grouped steps; each step has items in its notes (tap to expand). Tap "add chore".
4. /board: chore appears in Ready with area "Portland - Trip". Open it; steps show notes inline.
5. Focus mode: /get-started → /focus runs through the steps with stopwatch.
6. Repeat (2) with nights = 0; project title is `Pack for Portland · day trip`.
7. /add: type "pack for paris" → "break it down with ai" → 422 returns; alert shows clarification + "open the packing kit" button → click → lands on packing form with "pack for paris" prefilled in "anything else".
8. /add/kit/packing form validation: clear destination → button disabled; nights = -1 → button disabled; adults = 0 → button disabled.
9. /board → open a packing chore → EditTaskDialog → edit a step's notes → save → reload → notes persist.

- [ ] **Step 4: Final commit (only if any tweaks)** — if the smoke walkthrough surfaced any small fixes, commit them. Otherwise skip.

```
git status
```

If clean, stop here.

---

## Self-review against the spec

**1. Spec coverage** (each spec section → tasks):

- *Goal / Non-goals* — Plan honors them: mega-chore is a disabled placeholder (Task 12) and not implemented; no per-item check-off (notes are plain text); focus mode untouched.
- *Decisions table* — All decisions implemented: output model (Tasks 6, 20), input form (Tasks 2, 16), area + project title (Task 4–6), button placement (Task 18), picker layout (Task 13), framework shape (Tasks 12, 14, 17), suggestion hook (Tasks 10, 11, 19).
- *Architecture overview / Client* — Tasks 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22.
- *Architecture overview / Server* — Tasks 4, 6, 7, 8, 10, 11, 3.
- *Architecture overview / Shared* — Tasks 1, 2, 9.
- *Data flow* — Verified end-to-end by smoke item #1.
- *Packing kit details / Form* — Task 16 covers every field with defaults and constraints.
- *Packing kit details / Server prompt* — Task 4 sets the system prompt verbatim with the day-trip code-side conditional.
- *Packing kit details / Failure modes* — Task 16 maps 503/429/malformed to the alerts in spec.
- *AI breakdown ↔ kit suggestion hook* — Tasks 10, 11, 19.
- *Data model & persistence* — No DB migration. Task 3 handles step.notes write; Task 1 carries the optional notes through types; Task 21 renders on TaskCard; Task 22 enables editing.
- *Testing* — Pure-logic coverage (Tasks 2, 5, 12). UI/route tests deferred to manual smoke per the explicit deviation noted at the top.
- *Manual smoke list* — Task 23.

**2. Placeholder scan** — No "TBD" / "implement later" / "fill in details" / "add error handling" / "similar to Task N" / silent-code-step omissions. Every code change has its code.

**3. Type consistency** — `BreakdownStep.notes` is optional everywhere it appears. `PackingFormInput` is the single shared type used by both client form parser (Task 16) and server route validator (Task 7). `KitEntry` is the registry shape; `findKit` is used consistently in `AddScreen.tsx` (Task 19). Function names: `buildPackingUserMessage`, `buildPackingProjectTitle`, `buildPackingArea`, `generatePackingList`, `generatePackingKit` (client function name), `usePackingGenerator` — all match across tasks.

---

## Done definition

- All 23 tasks complete with their commits.
- `pnpm typecheck` and `pnpm test` pass.
- Manual smoke list walked through end-to-end with no regressions.
