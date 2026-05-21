# Mega-Chore Kit — design

**Status:** draft
**Date:** 2026-05-21
**Author:** will (with Claude)

## Goal

Ship the **mega-chore kit**, the second chore kit. It accepts a free-text "huge thing" — a chore that's really a project, or a chore where a single step is itself many hours of work — runs a short clarifying chat with the model, and produces **N chores grouped under a shared mega-chore**, ordered into parallel groups so the user is never told to "lay gravel" before "dig the trench."

The kit can't function without three pieces of supporting work, so all three are part of this spec:

1. A small **mega-chores data model** (linking field, ordering, title).
2. A **board treatment** for blocked chores (divider inside Ready, muted styling, hidden step lists) so generating 6+ chores at once doesn't tank the lane.
3. A **multi-chore variant of the breakdown review screen** for the post-chat review.

## Non-goals

- Quick-reply chips in the clarifying chat (planned follow-up).
- Persisting in-progress chat across navigation, reload, or app background — chat lives in React state only and is documented as such.
- Repeating mega-chores or re-running a past mega-chore from history.
- DAG-style arbitrary prerequisites. The order index + parallel group model covers the cases that matter.
- Editing mega-chore membership after creation (no "move this chore to another mega-chore" UI, no merge, no split).
- Manual creation of a mega-chore outside the kit.

## Decisions made during brainstorming

| Topic | Decision |
|---|---|
| When the mega-chore kit applies | A chore that's really a project, *or* a chore whose single step would take hours. |
| Splitting axis (zone vs phase) | AI infers from the description — no upfront form choice. |
| Loop termination | AI decides per-turn whether to ask or finalize. A persistent **"just give me the breakdown"** button short-circuits at any time. |
| Output review | Dedicated multi-chore review screen (collapsible chore cards grouped by parallel group), reached after the chat ends. |
| Linking the N chores | New `mega_chores` table; `mega_chore_id` + `mega_chore_group` columns on `tasks`. |
| Dependency model | Order index with parallel-group: same group = parallel; next group blocked until prior group fully done. |
| Where blocked chores live | All in Ready. Internal divider; blocked chores below, visually muted, steps hidden, drag-to-doing disabled. |
| Chat affordance v1 | Pure text — textarea on every turn. Chips are a follow-up. |
| Chore-count bounds | 2–10 chores per mega-chore, 1–30 steps per chore, prompt biased toward fewer chores with more steps. |
| `isBlocked` storage | Derived on board read from group completion; not stored on `tasks`. |
| AI breakdown ↔ kit suggestion | `/api/breakdown` 422 can include `suggestedKitKind: "mega-chore"`; AddScreen renders an inline CTA when the kit is enabled. Same hook as packing. |

## Architecture overview

### Client (`apps/phone/src/`)

```
kits/
  registry.ts                       → flip mega-chore to enabled: true.
  mega-chore/
    MegaChoreKitScreen.tsx          → two-state screen: initial textarea, then chat.
    use-mega-chore-turn.ts          → tanstack-query mutation hook for /turn.
    use-mega-chore-accept.ts        → tanstack-query mutation hook for /accept.
screens/
  AddScreen.tsx                     → already handles suggestedKitKind; light test pass.
  BoardScreen.tsx                   → no logic change; relies on Lane to split.
components/
  Lane.tsx                          → splits ready chores on isBlocked, renders divider.
  TaskCard.tsx                      → renders mega-chore chip; muted/hidden-steps when isBlocked.
  EditTaskDialog.tsx                → shows read-only mega-chore chip at top when applicable.
  MultiChoreBreakdownReview.tsx     → new component, sibling of BreakdownReview.
App.tsx                             → adds route /add/kit/mega-chore.
```

The chat UI is local React state only: `messages: { role: "user" | "assistant"; content: string }[]`. Leaving the screen loses the conversation. The initial textarea state shows copy noting this.

### Server (`apps/server/src/`)

```
routes/
  kits.ts                           → adds:
                                       POST /api/kits/mega-chore/turn
                                       POST /api/kits/mega-chore/accept
                                       (both rate-limited 30/hr, shared window)
  board.ts                          → emits megaChore + isBlocked per chore.
  move.ts                           → rejects moves of blocked chores into 'doing' (409).
  breakdown.ts                      → 'mega-chore' added to suggestedKitKind enum.
services/
  kits/
    mega-chore.ts                   → prompt builders (question mode, force-finalize),
                                       Claude call with forced tool use, zod-validated
                                       turn parser, multi-chore accept transaction.
  board.ts                          → computes per-mega-chore unblocked_through_group,
                                       attaches megaChore + isBlocked to each chore.
db/
  migrations/NNNN_mega_chores.sql   → creates mega_chores table, adds two columns to tasks.
```

### Shared (`packages/shared/src/`)

```
types.ts
  MegaChoreRef                      → { id, title, group, totalGroups }
  ChoreWithSteps                    → gains megaChore?: MegaChoreRef, isBlocked?: boolean
schemas.ts
  megaChoreBreakdownPreviewSchema   → mega chore title, area, chores[] with group + steps
  megaChoreTurnRequestSchema        → messages[], forceFinalize?: boolean
  megaChoreTurnResponseSchema       → discriminated union (question | breakdown)
```

## Data model

### New table: `mega_chores`

| column | type | notes |
|---|---|---|
| `id` | text primary key | uuid |
| `title` | text not null | shown in chore-card chip, EditTaskDialog header |
| `created_at` | timestamptz default now() | |

### Changes to `tasks`

| column | type | notes |
|---|---|---|
| `mega_chore_id` | text null, FK → `mega_chores.id` | null for ordinary chores |
| `mega_chore_group` | integer null | 1-indexed; null when `mega_chore_id` is null |

Constraint: `mega_chore_group` is non-null iff `mega_chore_id` is non-null (enforced by check constraint).

### Derived `isBlocked`

On board read, the server computes per mega-chore:

```
unblocked_through_group = min(group of any chore in this mega-chore that is not 'done') - 1
                         OR  max(group) when all chores in this mega-chore are done
```

A chore is blocked iff `mega_chore_group > unblocked_through_group`. The board response includes `isBlocked: boolean` and `megaChore: { id, title, group, totalGroups } | null` per chore so the client doesn't recompute.

This avoids a `blocked` column drifting out of sync with completion state and means manual completes/uncompletes via `EditTaskDialog` "just work" on next fetch.

### Lane placement

All mega-chore chores land in **ready** at creation. They never move to backlog (which doesn't exist anyway). Drag to `doing` is disabled in the UI when `isBlocked`. The move endpoint defensively rejects a move of a blocked chore into `doing` with 409.

### Migration

Single SQL migration:
- Create `mega_chores`.
- `ALTER TABLE tasks ADD COLUMN mega_chore_id text NULL REFERENCES mega_chores(id)`.
- `ALTER TABLE tasks ADD COLUMN mega_chore_group integer NULL`.
- Add the check constraint described above.

Existing rows are unaffected; both columns default null.

## Chat flow

### Screen: `MegaChoreKitScreen.tsx`

Two states, single component, internal toggle:

**(a) Initial input.** Single textarea ("describe the mega chore"), "start" button. If arrived via the kit-suggestion CTA from `/breakdown`, textarea is prefilled from location state. Helper copy notes that the chat is not saved if you leave.

**(b) Chat.** Vertically scrolling thread:
- User bubbles right-aligned (charcoal).
- Assistant bubbles left-aligned (cream + sage accent), matching the existing Workshop Dark Mono aesthetic.
- Bottom: textarea + "send" button, disabled while a turn is in flight.
- Sticky top bar with the **"just give me the breakdown"** escape button, visible from turn 1 onward.

State: `messages: ChatMessage[]`. Submitting "send" appends the user message and posts the full history to `/turn`. Submitting "just give me the breakdown" posts the same history with `forceFinalize: true`.

### Server: `POST /api/kits/mega-chore/turn`

Rate-limited 30/hr, shared window with `/breakdown` and `/kits/packing/generate`.

Request:
```ts
{
  messages: { role: "user" | "assistant"; content: string }[];
  forceFinalize?: boolean;
}
```

Response (discriminated union):
```ts
type Turn =
  | { kind: "question"; assistantMessage: string }
  | { kind: "breakdown"; preview: MegaChoreBreakdownPreview };
```

The service builds a system prompt (see below) and calls Claude with a forced tool call. The tool is `submit_mega_chore_turn` and takes a discriminated argument: either `{ kind: "question", text }` or `{ kind: "breakdown", megaChore, chores }`. Response is zod-validated against `megaChoreTurnResponseSchema`; malformed → 503.

When `forceFinalize: true`, the system prompt is amended with an explicit "stop asking and produce the breakdown now" line.

### Output schema (the `breakdown` branch)

```ts
MegaChoreBreakdownPreview = {
  megaChore: { title: string };
  area: string;
  chores: Array<{
    title: string;
    estimateMinutes: number;
    group: number;                 // 1-indexed, no gaps across the array
    steps: Array<{
      title: string;
      estimateMinutes: number;
      notes?: string;
    }>;
  }>;
};
```

Validation rules (zod):
- 2 ≤ `chores.length` ≤ 10.
- 1 ≤ `steps.length` ≤ 30 per chore.
- `group` values across the array form a consecutive 1..K sequence (no gaps).
- `megaChore.title` and `area` non-empty, trimmed.
- Step `notes` capped at 2000 chars (matches packing).

### Server prompt (sketch)

```
You are turning ONE huge thing into 2-10 ordered chores for someone with ADHD.
The user will describe a task that is too big for a normal AI breakdown — either
it's really a project disguised as a chore, or one of its natural steps would
itself take hours.

Your job: ask focused clarifying questions, then produce a breakdown.

Rules:
- Prefer FEWER, LARGER chores. Bias toward 3-6 chores with rich step lists
  over 8+ thin ones. Up to 30 steps per chore is fine if it keeps a coherent
  unit of work together.
- Each chore must be a coherent unit a human could focus on in one stretch
  (typically 30-120 minutes total, but longer is OK for things like digging).
- Steps within a chore should each take ~5-15 minutes.
- Order the chores into parallel groups (group: 1-indexed integer). Chores
  with the same group can be done in any order. A higher group must depend
  on the previous group being fully done (e.g. "lay gravel" group 2 depends
  on every "dig section" chore in group 1).
- Use phase-based grouping when work has true dependencies. Use zone-based
  grouping when work is parallelizable across areas. Most mega-chores are
  one or a mix of both.
- mega-chore title is a short label ("Clean the garage", "Build the tick
  moat"). The area for all chores in this mega-chore is the same — usually
  the mega-chore title or close to it.

Tool: ALWAYS respond by calling submit_mega_chore_turn. You may either ask
one focused question (kind: "question") or produce the final breakdown
(kind: "breakdown"). Ask at most a handful of focused questions before
finalizing.

[when forceFinalize is true]
The user has indicated they're done answering questions. Produce the
breakdown now — do not ask another question.
```

The user-message history is passed through as-is (assistant turns include only the question text; the discriminated-union envelope is internal).

### Failure modes

Match packing exactly:
- SDK throws / missing key → 503; client shows *"couldn't reach the ai — try again or use the regular breakdown."*
- Rate limit hit → 429; client shows *"hit the mega chore kit rate limit — try again in a bit."*
- Malformed tool response (zod parse fail) → 503.
- No manual fallback inside the kit screen — leaving the screen returns to `/add/kit`.

## Multi-chore review

### Screen: `MultiChoreBreakdownReview.tsx`

A new component, sibling of `BreakdownReview.tsx` (not a refactor — their shapes diverge enough that sharing would be lossy).

Layout:
- Header: editable mega-chore **title** (text field) and **area** (autocomplete reused from `EditTaskDialog`).
- A vertical list of chore cards, ordered by `(group, position-within-group)`. Chores sharing a `group` sit under a thin "group N" rule.
- Chore card is collapsible:
  - Collapsed (default for groups ≥ 2): title, estimate, step count, group chip.
  - Expanded (default for group 1): editable title + estimate, full step list (reusing the step-row UI from `BreakdownReview`, including the notes textarea added in the packing kit).
- Per chore: a small `↑ ↓` to bump its group up or down. Clamps to `1..K`; cannot create gaps in the group sequence (button disabled when the move would).
- No add-chore or delete-chore in v1. If the breakdown is wrong, the user re-runs the chat or edits after creation.
- Primary button: **"make it · N chores"**. Disabled when validation fails (empty mega-chore title, empty area, any empty chore title, gap in groups).

### Persist: `POST /api/kits/mega-chore/accept`

Body: the edited `MegaChoreBreakdownPreview`. Server in one transaction:
1. Inserts one `mega_chores` row.
2. For each chore: inserts a `tasks` row with `lane: "ready"`, the shared `area`, `mega_chore_id`, and `mega_chore_group`.
3. Inserts each chore's `steps` rows.
4. Returns `{ megaChoreId, choreIds }`.

Any insert failure rolls back the whole transaction.

Client navigates to `/board` on success. Newly created chores appear: group-1 above the divider, all later groups below it.

We deliberately do **not** reuse `/api/breakdown/accept` — its shape is single-chore and would need a discriminated extension. A dedicated endpoint is clearer and keeps the mega-chore transaction isolated.

## Board, card, and kit-suggestion hook

### Board read

`board.ts` computes `unblocked_through_group` per mega-chore and attaches `megaChore` + `isBlocked` to each `ChoreWithSteps`. The shape of `Board.ready` is unchanged — still a flat array.

### `Lane.tsx`

When rendering the `ready` lane, the component splits its array on `isBlocked`:

```
unblocked chores
─── blocked ───      (mono caption rule; hidden when no blocked chores)
blocked chores
```

The unblocked sublist preserves the existing order. The blocked sublist is sorted by `(megaChore.title, group, title)` so chores from the same mega-chore stay together.

### `TaskCard.tsx`

When `chore.megaChore` is present:
- Compact chip near the title: *"{megaChore.title} · g{group}/{totalGroups}"* in the mono caption style.
- When `isBlocked`:
  - `opacity: 0.55` on the card.
  - Sortable item marked non-draggable.
  - Step list hidden (collapsed, count-only) — this is the key relief for "ready gets really long."
  - Bottom row replaced with italic line: *"blocked — finish group {group - 1} first."*

### `EditTaskDialog.tsx`

No structural change. Shows a read-only mega-chore chip near the top when `chore.megaChore` is present so the user knows what they're touching. Toggling `done` on a group-K chore naturally unblocks group-(K+1) on the next board fetch (since `isBlocked` is derived).

### Focus mode

Untouched. A blocked chore can't reach `doing`, so focus mode never receives one. `mega_chore_id` is just inert metadata to focus mode.

### `/api/breakdown` suggestion hook

Identical pattern to packing:
- System prompt extended: *"If the input is one huge thing that's really a project — too big for steps under 10 minutes each, or where one step alone would take hours — set `isActionable: false` and `suggestedKitKind: "mega-chore"` with a clarification."*
- `submit_breakdown` tool schema's `suggestedKitKind` field is already optional string — no schema change needed beyond documenting `"mega-chore"` as a valid value.
- `AddScreen` already renders the inline CTA when the kind matches an enabled `KITS` entry. Flipping `mega-chore.enabled = true` in the registry lights it up.
- Initial textarea content is forwarded to `MegaChoreKitScreen` via location state and prefills the initial-input textarea.

## Testing

### Server

- `apps/server/src/services/kits/mega-chore.test.ts`
  - System-prompt builder: snapshot question-mode prompt; snapshot force-finalize variant.
  - Turn parser: model returns `kind: "question"` → service returns assistant message; `kind: "breakdown"` → service validates and returns `MegaChoreBreakdownPreview`.
  - Validation rejects: <2 chores, >10 chores, step count <1 or >30, group gaps (e.g. 1,1,3), empty mega-chore title, empty area.
- `apps/server/src/routes/kits.test.ts` (extends)
  - `POST /api/kits/mega-chore/turn`: invalid body → 400; SDK throws → 503; question → 200; breakdown → 200.
  - `POST /api/kits/mega-chore/accept`: creates 1 mega_chores row + N tasks + steps in one transaction; rolls back on any insert error.
- `apps/server/src/routes/board.test.ts` (extends)
  - Mega-chore with groups 1,1,2,3: group 1 has `isBlocked: false`; groups 2 and 3 have `isBlocked: true`.
  - Mark both group-1 chores `done` → group-2 chores flip to `isBlocked: false`; group-3 still blocked.
  - All chores done → no chore is `isBlocked`.
- `apps/server/src/routes/move.test.ts` (extends)
  - Moving a blocked chore into `doing` → 409.
- `apps/server/src/routes/breakdown.test.ts` (extends)
  - 422 with `suggestedKitKind: "mega-chore"` round-trips when the service returns it.

### Shared

- `packages/shared/src/schemas.test.ts` (extends) — `megaChoreBreakdownPreviewSchema` accepts a 3-group / 5-chore example; rejects each failure case above.

### Phone

- `kits/registry.test.ts` — `mega-chore.enabled === true`.
- `kits/mega-chore/MegaChoreKitScreen.test.tsx`
  - Initial textarea + "start" transitions to chat with user bubble + assistant question rendered.
  - "Send" posts the full message history.
  - "Just give me the breakdown" sets `forceFinalize: true` on the next turn.
  - A `kind: "breakdown"` response routes to the multi-chore review with preview in state.
- `components/MultiChoreBreakdownReview.test.tsx`
  - Groups ≥ 2 collapsed by default; expand toggle works.
  - Group `↑/↓` clamps and forbids creating a gap.
  - "make it" posts the edited preview to `/accept` and navigates to `/board`.
- `components/TaskCard.test.tsx` (extends)
  - Mega-chore chip renders when `megaChore` set.
  - Blocked card: opacity, drag disabled, steps hidden, "blocked — finish group N first" line.
- `components/Lane.test.tsx` (extends)
  - Ready with mixed blocked + unblocked renders the "blocked" divider once.
  - All unblocked → no divider.
- `screens/AddScreen.test.tsx` (extends)
  - 422 with `suggestedKitKind: "mega-chore"` shows the CTA and navigates to `/add/kit/mega-chore` with textarea content in location state.

### Manual smoke list

1. `/add` → "use a chore kit" → mega chore → "clean the garage" → chat asks 1–2 questions → answer → review shows ~5 chores in 2–3 groups → "make it" → board shows group-1 chores above the divider, rest below muted.
2. Mark all group-1 chores done → refresh → group-2 chores ungrey, draggable; divider moves down.
3. `/add` → "build a tick moat" in regular breakdown → 422 → inline "open the mega chore kit" CTA → land on mega-chore screen with input prefilled.
4. Mid-chat, hit "just give me the breakdown" — next assistant turn produces a breakdown.
5. Try to drag a blocked card to "doing" — drag is blocked client-side. API call (forced via devtools) returns 409.
6. `EditTaskDialog` on a mega-chore chore shows the mega-chore chip; toggling `done` cascades unblocking on next board fetch.

## Out of scope (named so we don't drift)

- Quick-reply chips in the clarifying chat (planned follow-up).
- Persisting chat across navigation, reload, or app background.
- Adding/removing chores from a mega-chore after creation; merging or splitting mega-chores.
- Manual creation of a mega-chore outside the kit.
- Repeating mega-chores or "do this mega-chore again from last time."
- DAG-shaped prerequisites beyond `group` parallelism.
- Auto-unblock notifications, animations, or board-level toasts.
- Dashboard app dedicated mega-chore UI (the existing board view will pick up the divider through shared `Lane` updates, but no dashboard-specific work).

## Open questions

None at spec time. The brainstorm closed every question raised.
