import { z } from "zod";
import { LANES } from "./types";

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  estimateMinutes: z.number().int().min(1).max(600),
  area: z.string().trim().min(1).max(60).nullable().optional(),
  notes: z.string().max(2000).optional(),
  lane: z.enum(LANES).optional(),
  isRepeating: z.boolean().optional(),
  projectId: z.string().nullable().optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  estimateMinutes: z.number().int().min(1).max(600).optional(),
  area: z.string().trim().min(1).max(60).nullable().optional(),
  notes: z.string().max(2000).optional(),
  isRepeating: z.boolean().optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const moveTaskSchema = z.object({
  lane: z.enum(LANES),
  beforeId: z.string().optional(),
  afterId: z.string().optional(),
});
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;

export const createStepSchema = z.object({
  title: z.string().trim().min(1).max(200),
  estimateMinutes: z.number().int().min(1).max(240),
});
export type CreateStepInput = z.infer<typeof createStepSchema>;

export const updateStepSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  estimateMinutes: z.number().int().min(1).max(240).optional(),
  notes: z.string().max(2000).optional(),
  /** Toggle completion. true = check (sets completedAt = now). false = uncheck. */
  completed: z.boolean().optional(),
});
export type UpdateStepInput = z.infer<typeof updateStepSchema>;

export const moveStepSchema = z.object({
  beforeId: z.string().optional(),
  afterId: z.string().optional(),
});
export type MoveStepInput = z.infer<typeof moveStepSchema>;

export const breakdownRequestSchema = z.object({
  text: z.string().trim().min(1).max(500),
});
export type BreakdownRequest = z.infer<typeof breakdownRequestSchema>;

export const breakdownStepSchema = z.object({
  title: z.string().trim().min(1).max(200),
  estimateMinutes: z.number().int().min(1).max(240),
  notes: z.string().max(2000).optional(),
});

export const acceptBreakdownSchema = z.object({
  projectTitle: z.string().trim().min(1).max(200),
  area: z.string().trim().min(1).max(60),
  steps: z.array(breakdownStepSchema).min(1).max(50),
  /** Whether the resulting chore (not individual steps) repeats weekly. */
  isRepeating: z.boolean().optional(),
});
export type AcceptBreakdownInput = z.infer<typeof acceptBreakdownSchema>;

export const credentialsSchema = z.object({
  username: z.string().trim().min(1).max(60),
  password: z.string().min(6).max(200),
});
export type Credentials = z.infer<typeof credentialsSchema>;

export const setupSchema = credentialsSchema.extend({
  setupToken: z.string().min(1).max(200).optional(),
});
export type SetupInput = z.infer<typeof setupSchema>;

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
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        if (unique[i] !== unique[i - 1]! + 1) return false;
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
