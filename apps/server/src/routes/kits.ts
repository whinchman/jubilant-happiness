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
