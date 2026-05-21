# Chore Kits — design

**Status:** draft
**Date:** 2026-05-21
**Author:** will (with Claude)

## Goal

Add a small framework for **specialized chore generators** ("chore kits") in TODO-ER, and ship one — **packing** — as the first kit. A chore kit is a guided alternative to the free-text AI breakdown: a structured form tuned for a recurring category of chore, generating a result that fits the existing chore-with-steps data model.

The framework is sized for the kit roadmap (at least one more kit — *mega chore* — planned, structurally different from packing), without prematurely abstracting an output shape that we already know will diverge.

## Non-goals

- **Mega-chore kit** — referenced as a forthcoming kit and used to size the framework. Out of scope for this spec; will land in its own spec.
- **Reusing past kit submissions** ("re-pack from last trip"). Future work.
- **Per-item check-off UI for packing.** Items live in step notes as comma-separated text; no chip/checkbox affordance per item.
- **Changing focus-mode behavior** for packing chores. They run as normal chores with normal stopwatched steps.

## Decisions made during brainstorming

| Topic | Decision |
|---|---|
| Output model for packing | Grouped steps (5–10), each step is a category, item list in step `notes` |
| Input model for packing | Structured form (not free text) |
| Form fields | Destination, # nights (0–60), Trip type, Climate, Travelers (Adults/Children/Dogs), Anything else |
| Auto-built area | `"{Destination} - Trip"` (groups other trip-prep chores in the area autocomplete) |
| Auto-built project title | `"Pack for {Destination} · {nights}n"`, or `"Pack for {Destination} · day trip"` when nights=0 |
| Entry point on /add | Third button below "break it down with ai", copy: **"use a chore kit"** |
| Picker layout | Card grid with monogram icon, kit title, blurb, arrow (or "soon" badge if disabled) |
| Framework shape | Shared shell (registry, picker, URL prefix, light shared utilities). Each kit owns its form, prompt, and output adapter. |
| AI breakdown ↔ kit suggestion | When the standard AI breakdown detects a match, the 422 response includes `suggestedKitKind` so the AddScreen can render an inline "open the X kit" CTA |

## Architecture overview

### Client (`apps/phone/src/`)

```
kits/
  registry.ts                 → KITS array (id, title, blurb, icon, enabled).
                                Route is derived: `/add/kit/${id}`.
  packing/
    PackingKitScreen.tsx      → structured form. On success, renders the
                                (modified) BreakdownReview inline — no extra
                                wrapper component.
    use-packing-generator.ts  → tanstack-query mutation hook
screens/
  KitsScreen.tsx              → the picker. Reads KITS, renders the card grid (layout A).
  AddScreen.tsx               → gains the "use a chore kit" button. Renders the
                                kit-suggestion CTA when the breakdown 422 includes
                                a suggestedKitKind that is enabled in KITS.
components/
  BreakdownReview.tsx         → modified: renders step.notes inline (read-only by
                                default, tap-to-edit) when any step has notes.
  TaskCard.tsx                → modified: step rows show step.notes inline when present.
  EditTaskDialog.tsx          → modified: step editor includes a notes textarea.
App.tsx                       → adds routes /add/kit and /add/kit/packing
```

`KITS` v1:

```ts
export const KITS = [
  { id: "packing",    title: "packing",    blurb: "a trip → a packing list, grouped by category.",      icon: "PK", enabled: true  },
  { id: "mega-chore", title: "mega chore", blurb: "one huge thing → several chores, each with steps.", icon: "MC", enabled: false },
] as const;
// route is derived: `/add/kit/${kit.id}`
```

### Server (`apps/server/src/`)

```
routes/
  kits.ts                     → POST /api/kits/packing/generate
                                rate-limited at 30/hr (same window as /breakdown)
services/
  kits/
    packing.ts                → builds the prompt from the form, calls Claude with
                                a forced tool call, returns BreakdownPreview
                                (with each step's notes populated).
  breakdown.ts                → modified: BreakdownOutcome carries an optional
                                suggestedKitKind on the not-actionable branch.
routes/
  breakdown.ts                → modified: 422 response includes suggestedKitKind
                                when present.
  breakdown.ts (accept route) → modified: writes step.notes when present.
```

### Shared (`packages/shared/src/`)

```
types.ts                      → BreakdownStep gains optional notes?: string
schemas.ts                    → breakdownStepSchema gains optional notes (max 2000)
                                packingFormSchema (new) — zod schema for the form
```

## Data flow — packing kit happy path

1. User on /add → taps **"use a chore kit"** → /add/kit.
2. `KitsScreen` renders `KITS`. User taps the **packing** card → /add/kit/packing.
3. `PackingKitScreen` shows the structured form. zod-validates on submit.
4. POST `/api/kits/packing/generate` with the form payload.
5. Server's packing service builds the Claude prompt + calls the model via forced tool call. The tool schema returns `projectTitle`, `area`, and `steps[]` where each step has `title`, `estimateMinutes`, and `notes`.
6. Server returns the `BreakdownPreview`. `PackingKitScreen` renders the modified `BreakdownReview` (now with step-notes UI) inline. User tweaks any field.
7. User taps **"pack it · N steps"** → POST `/api/breakdown/accept` (existing route, now persists step notes). Server creates one project, one chore (`area = "{Destination} - Trip"`, `lane = "ready"`), and N step rows with notes.
8. Client navigates to /board. Chore appears in *Ready*.

## Packing kit details

### Form

| Field | Type | Constraints | Default |
|---|---|---|---|
| Destination | text | required, trimmed, 1–80 chars | — |
| # nights | number | integer, 0–60 | 1 |
| Trip type | select | one of: business, leisure, outdoors, family visit, beach, ski | leisure |
| Climate | select | one of: hot, mild, cold, mixed, rainy | mild |
| Adults | number | integer, 1–20 | 1 |
| Children | number | integer, 0–20 | 0 |
| Dogs | number | integer, 0–20 | 0 |
| Anything else | textarea | optional, max 500 chars | — |

Primary button copy: **"pack it"**. Disabled until form is valid.

### Server prompt (sketch)

```
You generate concise packing lists for someone with ADHD who needs a clear,
ordered plan rather than a wall of items.

Rules:
- Output 5–10 grouped steps. Each step is a packing CATEGORY, not an individual
  item. Order steps in the sequence the user should pack them (documents first,
  bulky last, easy-to-forget at the end).
- Step title is a short imperative ("pack documents", "pack 3 days of clothes",
  "pack toiletries"). estimateMinutes is the realistic time to pack that
  category (3–10 minutes).
- Step notes is a comma-separated string of the actual items in that category.
  Be specific (sizes, counts where useful: "shirts × 3", "1 jacket").
- Adjust quantities to the # of nights and travelers. Day trip (0 nights) =
  much lighter. Children imply kid-equivalents (extra change, snacks). Dogs
  imply a small pet category step (leash, food, bowl, bedding) when present.
- Use trip type + climate to drive what gets in (no swimwear for a ski trip,
  layers for cold, formal for business if relevant).

Trip:
  destination: {destination}
  nights: {nights}
  trip type: {trip type}
  climate: {climate}
  travelers: {adults} adult(s), {children} child(ren), {dogs} dog(s)
  anything else: {anything else | "—"}

projectTitle: "Pack for {destination} · {nights}n" (or "· day trip")
area: "{destination} - Trip"

Always respond by calling the submit_packing_list tool.
```

When `nights === 0`, the user-message builder appends a literal extra line
`Note: 0 nights means this is a day trip — pack lighter accordingly.`
right after the trip block. (Code-side conditional, not a template token.)

Tool schema mirrors the existing `submit_breakdown` shape, with steps including a required `notes` string.

### Failure modes

- Anthropic SDK throws / missing key → 503, client shows alert *"couldn't reach the ai — try again or add a single task from the add screen."*
- Rate limit hit → 429, client shows *"hit the packing kit rate limit — try again in a bit."*
- Malformed tool response (zod parse fail) → 503 (same as breakdown).
- No manual fallback inside the packing screen — the whole point of the form is the generation. Manual single-task creation stays on /add.

## AI breakdown ↔ kit suggestion hook

- `BreakdownOutcome` (server) gains an optional `suggestedKitKind?: string` on the `actionable: false` branch.
- The `submit_breakdown` tool schema gains an optional `suggestedKitKind` string.
- System prompt is extended to instruct: *"If the input clearly describes one of these kit-supported tasks (packing for a trip, etc.), set `isActionable: false` and set `suggestedKitKind` to the kit id, plus a clarification."*
- Route returns the kind in the 422 body.
- AddScreen: when the 422 carries a `suggestedKitKind` matching an `enabled: true` entry in `KITS`, the clarification alert renders an extra primary CTA (*"open the packing kit →"*) that navigates to that kit's route. The original textarea content is passed via location state and the kit screen drops it into the "Anything else" field as a starting point. If the kind is unknown or disabled, only the clarification text shows.

## Data model & persistence

- **No DB migration.** The `tasks` table already has a `notes` column; we start populating it for step rows.
- `BreakdownStep` (shared) gains optional `notes?: string`.
- `breakdownStepSchema` (shared) gains optional `notes: z.string().max(2000).optional()`.
- `/api/breakdown/accept` writes `step.notes` when present.
- `TaskCard` step rows display `notes` in a smaller mono font under the step title.
- `EditTaskDialog` gains a notes textarea on its step editor.

The board, focus mode, drag-drop, repeating logic, weekly reset, area autocomplete, and dashboard app are untouched. A packing chore is a normal chore with normal grouped steps.

## Testing

### Server

- `apps/server/src/services/kits/packing.test.ts`
  - Builds expected prompt for a 3-night Portland leisure trip (snapshot the user message).
  - Builds expected prompt for nights=0 with the day-trip hint.
  - Parses a well-formed tool response → returns a preview with projectTitle `"Pack for Portland · 3n"`, area `"Portland - Trip"`, 5–10 steps, each step has populated notes.
  - Malformed tool response → throws.
- `apps/server/src/routes/kits.test.ts`
  - POST /api/kits/packing/generate: invalid body → 400; service throws → 503; success → 200 with preview.
- `apps/server/src/routes/breakdown.test.ts`
  - 422 response carries `suggestedKitKind` when the service returns one.

### Shared

- `packages/shared/src/schemas.test.ts` (new) — packingFormSchema accepts valid forms (including nights=0); rejects empty destination, nights=-1, nights=61, adults=0, unknown trip type/climate, anything-else over 500 chars; trims destination.

### Phone

- `kits/registry.test.ts` — `KITS` shape; packing enabled; mega-chore disabled.
- `screens/KitsScreen.test.tsx` — enabled kit cards navigate; disabled kit cards show "soon" and don't navigate.
- `kits/packing/PackingKitScreen.test.tsx` — submit disabled until valid; submit posts the expected payload; 503 renders the alert.
- `components/BreakdownReview.test.tsx` (new) — when steps include notes, notes render under the title and edit-on-tap toggles a TextField.
- `screens/AddScreen.test.tsx` (new, light) — "use a chore kit" navigates to /add/kit. 422 with `suggestedKitKind: "packing"` renders the inline CTA and clicking it navigates to /add/kit/packing.

### Manual smoke list

After implementation, walk through:
1. Add a packing chore: 3-night Portland leisure trip → 5–10 grouped steps with item notes; chore appears on board with area `"Portland - Trip"`; focus mode runs the steps with stopwatch.
2. Add a day-trip packing chore (nights=0) → project title `"Pack for {dest} · day trip"`.
3. Type *"pack for paris"* into the regular AI breakdown → 422 → inline "open the packing kit" CTA → click → land on packing form with *"pack for paris"* prefilled in *Anything else*.
4. Form validation: empty destination, nights=-1, 0 adults — submit disabled.
5. EditTaskDialog: edit a step's notes; reload; notes persisted.

## Out of scope (named so we don't drift)

- Mega-chore kit (own spec).
- Saved/templated past trips.
- Per-item check-off UI (chips, checkboxes) inside step notes.
- Auto-area edits to historical chores when a new "{Destination} - Trip" area is created.
- Server-side caching/dedup of repeat packing prompts.
- Importing a packing list from an external source.

## Open questions

None at spec time. The brainstorm closed every question raised.
