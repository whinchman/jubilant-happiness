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
