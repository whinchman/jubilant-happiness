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

const toolOutputSchema = z.object({
  projectTitle: z.string(),
  area: z.string(),
  steps: z
    .array(
      z.object({
        title: z.string(),
        estimateMinutes: z.number(),
        notes: z.string().max(2000),
      }),
    )
    .min(5)
    .max(10),
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
