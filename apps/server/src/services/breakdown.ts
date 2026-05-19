import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { BreakdownStep } from "@todoer/shared";

const SYSTEM_PROMPT = `You break household chores and tasks into tiny, concrete steps for someone with ADHD who struggles with the activation energy of getting started.

Rules:
- Each step must be doable in 10 minutes or less. Estimate honestly (1-10 minutes).
- Write each step as a short, specific imperative action ("Put the dishes in the dishwasher"), never a vague noun.
- Order the steps the way they should actually be done.
- Produce between 3 and 10 steps. If the task is genuinely huge, give the best 9 starting steps and make the 10th "Plan the rest of <task>".
- Choose a short "area" label that groups this task with similar chores (e.g. Kitchen, Bathroom, Bedroom, Yard, Laundry, Admin, Errands).
- "projectTitle" is a short name for the overall task.

If the input is too vague or is not an actionable task, set isActionable to false, leave steps empty, and put one specific clarifying question in "clarification".

Always respond by calling the submit_breakdown tool.`;

const toolOutputSchema = z.object({
  isActionable: z.boolean(),
  clarification: z.string().optional(),
  projectTitle: z.string(),
  area: z.string(),
  steps: z.array(
    z.object({
      title: z.string(),
      estimateMinutes: z.number(),
    }),
  ),
});

export type BreakdownOutcome =
  | { actionable: true; projectTitle: string; area: string; steps: BreakdownStep[] }
  | { actionable: false; clarification: string };

/**
 * Asks Claude to break a task into <=10-minute steps via a forced tool call.
 * Throws if the API key is missing or the request fails — the route maps that
 * to a 503 so the client can fall back to adding a single task.
 */
export async function breakdownTask(text: string): Promise<BreakdownOutcome> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  const message = await client.messages.create({
    model,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: "submit_breakdown",
        description: "Submit the breakdown of the user's task into small, ordered steps.",
        input_schema: {
          type: "object",
          properties: {
            isActionable: {
              type: "boolean",
              description: "True if the input is a concrete, actionable task.",
            },
            clarification: {
              type: "string",
              description: "When isActionable is false, one specific clarifying question.",
            },
            projectTitle: {
              type: "string",
              description: "A short name for the overall task.",
            },
            area: {
              type: "string",
              description: "A short grouping label, e.g. Kitchen, Yard, Laundry, Admin.",
            },
            steps: {
              type: "array",
              description: "The ordered steps; empty when isActionable is false.",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  estimateMinutes: { type: "integer", minimum: 1, maximum: 10 },
                },
                required: ["title", "estimateMinutes"],
              },
            },
          },
          required: ["isActionable", "projectTitle", "area", "steps"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "submit_breakdown" },
    messages: [{ role: "user", content: text }],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("the model did not return a breakdown");
  }

  const parsed = toolOutputSchema.safeParse(toolUse.input);
  if (!parsed.success) throw new Error("the model returned a malformed breakdown");
  const data = parsed.data;

  if (!data.isActionable) {
    return {
      actionable: false,
      clarification:
        data.clarification?.trim() ||
        "Could you describe the task in a little more detail?",
    };
  }

  const steps: BreakdownStep[] = data.steps
    .slice(0, 10)
    .map((step) => ({
      title: step.title.trim(),
      estimateMinutes: Math.min(Math.max(Math.round(step.estimateMinutes), 1), 30),
    }))
    .filter((step) => step.title.length > 0);

  if (steps.length === 0) {
    return {
      actionable: false,
      clarification: "I couldn't break that into steps — could you say a bit more?",
    };
  }

  return {
    actionable: true,
    projectTitle: data.projectTitle.trim() || text.slice(0, 100),
    area: data.area.trim() || "General",
    steps,
  };
}
