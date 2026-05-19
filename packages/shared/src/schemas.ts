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

export const breakdownRequestSchema = z.object({
  text: z.string().trim().min(1).max(500),
});
export type BreakdownRequest = z.infer<typeof breakdownRequestSchema>;

export const breakdownStepSchema = z.object({
  title: z.string().trim().min(1).max(200),
  estimateMinutes: z.number().int().min(1).max(240),
});

export const acceptBreakdownSchema = z.object({
  projectTitle: z.string().trim().min(1).max(200),
  area: z.string().trim().min(1).max(60),
  steps: z.array(breakdownStepSchema).min(1).max(20),
});
export type AcceptBreakdownInput = z.infer<typeof acceptBreakdownSchema>;

export const credentialsSchema = z.object({
  username: z.string().trim().min(1).max(60),
  password: z.string().min(6).max(200),
});
export type Credentials = z.infer<typeof credentialsSchema>;
