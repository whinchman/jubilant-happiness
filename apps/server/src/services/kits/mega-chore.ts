import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage } from "@todoer/shared";
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
        input_schema: TOOL_INPUT_SCHEMA as unknown as Anthropic.Tool["input_schema"],
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
